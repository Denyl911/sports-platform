# ERD — Sports Platform Database

Diagrama Entidad-Relación del esquema de `@sports/db` (PostgreSQL + Drizzle ORM).

```mermaid
erDiagram
    SPORTS ||--o{ SPORT_EVENT_TYPES : "tiene"
    SPORTS ||--o{ TOURNAMENTS : "organiza"

    TOURNAMENTS ||--o{ TOURNAMENT_EDITIONS : "tiene"

    TOURNAMENT_EDITIONS ||--o{ TOURNAMENT_STAGES : "se compone de"
    TOURNAMENT_EDITIONS ||--o{ TOURNAMENT_ROSTERS : "inscribe jugadores"

    TOURNAMENT_STAGES ||--o{ STAGE_GROUPS : "agrupa"
    TOURNAMENT_STAGES ||--o{ STAGE_TEAM_REGISTRATIONS : "registra equipos"
    TOURNAMENT_STAGES ||--o{ MATCHES : "contiene partidos"

    STAGE_GROUPS |o--o{ STAGE_TEAM_REGISTRATIONS : "ubica"
    STAGE_GROUPS ||--o{ MATCHES : "programa"
    STAGE_GROUPS ||--o{ STAGE_STANDINGS : "posiciona"

    CLUBS ||--o{ TEAMS : "posee"

    TEAMS |o--o{ STAGE_TEAM_REGISTRATIONS : "participa"
    TEAMS ||--o{ TOURNAMENT_ROSTERS : "convoca"
    TEAMS |o--o{ MATCHES : "local (home)"
    TEAMS |o--o{ MATCHES : "visitante (away)"
    TEAMS |o--o{ MATCHES : "ganador (winner)"
    TEAMS ||--o{ STAGE_STANDINGS : "acumula"
    TEAMS |o--o{ MATCH_EVENTS : "protagoniza"

    PLAYERS ||--o{ TOURNAMENT_ROSTERS : "pertenece a planteles"
    PLAYERS |o--o{ MATCH_EVENTS : "autor"
    PLAYERS |o--o{ MATCH_EVENTS : "asistencia"

    VENUES |o--o{ MATCHES : "sede"

    MATCHES ||--o{ MATCH_PERIODS : "se divide en"
    MATCHES ||--o{ MATCH_EVENTS : "registra eventos"
    MATCHES |o--o| MATCHES : "next_match_id"
    MATCHES |o--o| MATCHES : "loser_next_match_id"

    SPORTS {
        varchar id PK "slug: soccer, basketball"
        varchar name
        boolean has_draws
        varchar period_name
        integer regular_periods
        jsonb scoring_rules
    }
    SPORT_EVENT_TYPES {
        uuid id PK
        varchar sport_id FK
        varchar code "goal, foul, ace..."
        varchar name
        boolean affects_score
        integer default_value
    }
    VENUES {
        uuid id PK
        varchar name
        text address
        integer field_count
    }
    TOURNAMENTS {
        uuid id PK
        varchar sport_id FK
        varchar name
        text description
        timestamp created_at
    }
    TOURNAMENT_EDITIONS {
        uuid id PK
        uuid tournament_id FK
        varchar name
        varchar category
        date start_date
        date end_date
        enum status "draft..archived"
    }
    TOURNAMENT_STAGES {
        uuid id PK
        uuid edition_id FK
        varchar name
        enum stage_type "round_robin, single_elim, double_elim, swiss, manual"
        integer sequence_order UK
        jsonb advancement_rules
    }
    STAGE_GROUPS {
        uuid id PK
        uuid stage_id FK
        varchar name "UK(stage,name)"
    }
    CLUBS {
        uuid id PK
        varchar name UK
        text logo_url
        timestamp created_at
    }
    TEAMS {
        uuid id PK
        uuid club_id FK "nullable"
        varchar name
        varchar category
    }
    PLAYERS {
        uuid id PK
        varchar first_name
        varchar last_name
        date birth_date
        varchar id_card_number UK
    }
    STAGE_TEAM_REGISTRATIONS {
        uuid id PK
        uuid stage_id FK "NOT NULL"
        uuid group_id FK "nullable"
        uuid team_id FK
        integer seed_number
    }
    TOURNAMENT_ROSTERS {
        uuid id PK
        uuid edition_id FK
        uuid team_id FK
        uuid player_id FK
        integer jersey_number
        varchar position
        boolean is_captain "único por equipo/edición"
    }
    MATCHES {
        uuid id PK
        uuid stage_id FK "NOT NULL"
        uuid group_id FK "nullable"
        integer round_number
        integer match_number
        uuid home_team_id FK "nullable"
        uuid away_team_id FK "nullable"
        uuid winner_team_id FK "nullable"
        uuid venue_id FK
        timestamp scheduled_at
        enum status "scheduled, in_progress, paused, finished, cancelled, walkover"
        integer home_score
        integer away_score
        uuid next_match_id FK "self"
        enum next_match_slot "home|away"
        uuid loser_next_match_id FK "self"
        enum loser_next_match_slot "home|away"
        jsonb metadata
    }
    MATCH_PERIODS {
        uuid id PK
        uuid match_id FK
        integer period_number "UK(match,num,type)"
        enum period_type "regular, overtime..."
        integer home_score
        integer away_score
    }
    MATCH_EVENTS {
        uuid id PK
        uuid match_id FK
        uuid team_id FK "nullable"
        uuid player_id FK "nullable"
        uuid assist_player_id FK "nullable"
        integer period_number
        integer minute_or_second
        varchar event_type
        integer event_value
        jsonb metadata
    }
    STAGE_STANDINGS {
        uuid id PK
        uuid group_id FK
        uuid team_id FK
        integer played
        integer won
        integer drawn
        integer lost
        integer points
        integer score_for
        integer score_against
        integer score_difference "GENERATED"
        integer bonus_points
        integer rank_position
        timestamp updated_at
    }
```

## Notas

- Las líneas `|o--o` indican FK nullable (opcional); `||--o` indica NOT NULL (obligatoria).
- `MATCHES` tiene dos auto-relaciones para la progresión de llaves:
  - Eliminatoria simple: `next_match_id`.
  - Eliminatoria doble: además `loser_next_match_id`, con slots `home|away` para saber en qué posición entra el ganador/perdedor.
- `STAGE_TEAM_REGISTRATIONS` es la tabla de unión etapa↔equipos; el grupo es opcional para soportar eliminatoria y sistema suizo.
- `SCORE_DIFFERENCE` es una columna generada (`score_for - score_against`) y no debe escribirse manualmente.
- Las relaciones de aplicación (para `db.query.*` de Drizzle) están declaradas en `src/relations.ts`.
