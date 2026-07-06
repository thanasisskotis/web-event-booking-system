-- ============================================================
-- Εφαρμογή Διαχείρισης Εκδηλώσεων και Ηλεκτρονικών Κρατήσεων
-- Τελικό σχήμα βάσης δεδομένων (PostgreSQL)
-- ============================================================

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE user_priviledge       AS ENUM ('ADMIN', 'ORGANIZER', 'PARTICIPANT');
CREATE TYPE user_status     AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE event_status    AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
CREATE TYPE booking_status  AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- ============================================
-- USERS
-- ============================================
CREATE TABLE Users (
    user_id         SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    phone           VARCHAR(30) NOT NULL,
    address         VARCHAR(300),
    city            VARCHAR(100),
    country         VARCHAR(100),
    tax_id          VARCHAR(20) UNIQUE NOT NULL,     -- ΑΦΜ
    priviledge            user_priviledge NOT NULL DEFAULT 'PARTICIPANT',
    status          user_status NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CATEGORIES (lookup table για M:N με Events)
-- ============================================
CREATE TABLE Categories (
    category_id     SERIAL PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL
);

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE Events (
    event_id        SERIAL PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    venue           VARCHAR(200) NOT NULL,
    address         VARCHAR(300) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    country         VARCHAR(100) NOT NULL,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    start_datetime  TIMESTAMPTZ NOT NULL,
    end_datetime    TIMESTAMPTZ NOT NULL,
    capacity        INTEGER NOT NULL CHECK (capacity > 0),
    organizer_id    INTEGER NOT NULL REFERENCES Users(user_id),
    status          event_status NOT NULL DEFAULT 'DRAFT',
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Full-text search πάνω σε τίτλο + περιγραφή (requirement 8: αναζήτηση free-text)
    search_vector   tsvector GENERATED ALWAYS AS (
                        to_tsvector('greek', coalesce(title,'') || ' ' || coalesce(description,''))
                    ) STORED,

    CHECK (end_datetime > start_datetime)
);

-- Junction table: Event M:N Category
CREATE TABLE EventCategories (
    event_id        INTEGER NOT NULL REFERENCES Events(event_id) ON DELETE CASCADE,
    category_id     INTEGER NOT NULL REFERENCES Categories(category_id),
    PRIMARY KEY (event_id, category_id)
);

-- Media / Photos (Event 1:N Photo)
CREATE TABLE EventPhotos (
    photo_id        SERIAL PRIMARY KEY,
    event_id        INTEGER NOT NULL REFERENCES Events(event_id) ON DELETE CASCADE,
    file_path       VARCHAR(300) NOT NULL
);

-- ============================================
-- TICKET TYPES (Event 1:N TicketType)
-- ============================================
CREATE TABLE TicketTypes (
    ticket_type_id  SERIAL PRIMARY KEY,
    event_id        INTEGER NOT NULL REFERENCES Events(event_id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    quantity        INTEGER NOT NULL CHECK (quantity >= 0),
    available       INTEGER NOT NULL CHECK (available >= 0),

    CHECK (available <= quantity)
    -- Σημείωση: ο περιορισμός SUM(quantity) <= Events.capacity ελέγχεται
    -- στο επίπεδο εφαρμογής (backend, εντός transaction), όχι εδώ,
    -- γιατί απαιτεί aggregate πάνω σε πολλές γραμμές/πίνακες.
);

-- ============================================
-- BOOKINGS (Event 1:N Booking, έμμεσα μέσω TicketType)
-- ============================================
CREATE TABLE Bookings (
    booking_id          SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES Users(user_id),      -- Attendee
    ticket_type_id      INTEGER NOT NULL REFERENCES TicketTypes(ticket_type_id),
    booking_time        TIMESTAMPTZ NOT NULL DEFAULT now(),
    number_of_tickets   INTEGER NOT NULL CHECK (number_of_tickets > 0),
    total_cost          NUMERIC(10,2) NOT NULL CHECK (total_cost >= 0),
    booking_status      booking_status NOT NULL DEFAULT 'PENDING'
);

-- ============================================
-- MESSAGES (Organizer <-> Participant messaging)
-- ============================================
CREATE TABLE Messages (
    message_id      SERIAL PRIMARY KEY,
    sender_id       INTEGER NOT NULL REFERENCES Users(user_id),
    recipient_id    INTEGER NOT NULL REFERENCES Users(user_id),
    event_id        INTEGER REFERENCES Events(event_id),   -- nullable: όχι κάθε μήνυμα αφορά event
    subject         VARCHAR(200),
    body            TEXT NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================
-- EVENT VIEWS (implicit feedback για recommendation algorithm
-- όταν ο χρήστης δεν έχει ιστορικό κρατήσεων)
-- ============================================
CREATE TABLE EventViews (
    view_id     SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES Users(user_id),
    event_id    INTEGER NOT NULL REFERENCES Events(event_id),
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Foreign keys (η PostgreSQL δεν τα δείχνει αυτόματα)
CREATE INDEX idx_events_organizer          ON Events(organizer_id);
CREATE INDEX idx_eventcategories_category  ON EventCategories(category_id);
CREATE INDEX idx_eventphotos_event         ON EventPhotos(event_id);
CREATE INDEX idx_tickettypes_event         ON TicketTypes(event_id);
CREATE INDEX idx_bookings_user             ON Bookings(user_id);
CREATE INDEX idx_bookings_tickettype       ON Bookings(ticket_type_id);
CREATE INDEX idx_messages_sender           ON Messages(sender_id);
CREATE INDEX idx_messages_recipient        ON Messages(recipient_id);
CREATE INDEX idx_eventviews_user           ON EventViews(user_id);
CREATE INDEX idx_eventviews_event          ON EventViews(event_id);

-- Αναζήτηση (requirement 8: κατηγορία, τίτλος/περιγραφή, ημερομηνίες, τιμή, τοποθεσία)
CREATE INDEX idx_events_city       ON Events(city);
CREATE INDEX idx_events_country    ON Events(country);
CREATE INDEX idx_events_start      ON Events(start_datetime);
CREATE INDEX idx_events_status     ON Events(status);
CREATE INDEX idx_events_search     ON Events USING gin(search_vector);
CREATE INDEX idx_tickettypes_price ON TicketTypes(price);

-- ============================================
-- SEED DATA
-- ============================================

-- Built-in admin χρήστης (requirement 3)
-- Password hash πρέπει να παραχθεί εκ των προτέρων με bcrypt (π.χ. bcrypt.hash('admin123', 10))
-- Αντικατέστησε το placeholder hash παρακάτω με το πραγματικό hash σου.
INSERT INTO Users (username, password_hash, first_name, last_name, email, phone, tax_id, priviledge, status)
VALUES ('admin', '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'System', 'Admin', 'admin@app.gr', '2100000000', '000000000', 'ADMIN', 'APPROVED');

-- Test categories
INSERT INTO Categories (name) VALUES
('Music'), ('Theatre'), ('Conference'), ('Sports'), ('Workshop');

-- Test organizer
INSERT INTO Users (username, password_hash, first_name, last_name, email, phone, tax_id, priviledge, status)
VALUES ('org_athens', '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'Maria', 'Papadopoulou', 'maria@events.gr', '2100000001', '111111111', 'ORGANIZER', 'APPROVED');

-- Test event
INSERT INTO Events (title, event_type, venue, address, city, country, start_datetime, end_datetime, capacity, organizer_id, status, description)
VALUES ('Συναυλία Δοκιμής', 'Concert', 'Θέατρο Πόλης', 'Λ. Κεντρική 25', 'Αθήνα', 'Greece', '2026-08-12 20:30', '2026-08-12 23:00', 350, 2, 'PUBLISHED', 'Δοκιμαστική εκδήλωση');

INSERT INTO EventCategories (event_id, category_id) VALUES (1, 1); -- Music

INSERT INTO TicketTypes (event_id, name, price, quantity, available)
VALUES (1, 'General Admission', 18.00, 250, 250),
       (1, 'Student', 12.00, 100, 100);