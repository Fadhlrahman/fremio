-- ============================================
-- FREMIO SEED DATA
-- Sample data for development/testing
-- ============================================

-- Sample frames
INSERT INTO frames (id, name, description, category, image_path, slots, max_captures, created_by)
VALUES 
(
    'frame-sample-001',
    'Classic Portrait',
    'Frame portrait klasik dengan border elegant',
    'portrait',
    '/uploads/frames/sample-portrait.webp',
    '[{"id": "slot_1", "left": 0.1, "top": 0.1, "width": 0.8, "height": 0.6, "aspectRatio": "4:5"}]',
    1,
    (SELECT id FROM users WHERE email = 'admin@fremio.com' LIMIT 1)
),
(
    'frame-sample-002',
    'Duo Photo',
    'Frame untuk 2 foto berdampingan',
    'couple',
    '/uploads/frames/sample-duo.webp',
    '[{"id": "slot_1", "left": 0.05, "top": 0.2, "width": 0.4, "height": 0.3}, {"id": "slot_2", "left": 0.55, "top": 0.2, "width": 0.4, "height": 0.3}]',
    2,
    (SELECT id FROM users WHERE email = 'admin@fremio.com' LIMIT 1)
),
(
    'frame-sample-003',
    'Grid 4 Photo',
    'Frame grid untuk 4 foto',
    'grid',
    '/uploads/frames/sample-grid.webp',
    '[{"id": "slot_1", "left": 0.05, "top": 0.05, "width": 0.4, "height": 0.25}, {"id": "slot_2", "left": 0.55, "top": 0.05, "width": 0.4, "height": 0.25}, {"id": "slot_3", "left": 0.05, "top": 0.35, "width": 0.4, "height": 0.25}, {"id": "slot_4", "left": 0.55, "top": 0.35, "width": 0.4, "height": 0.25}]',
    4,
    (SELECT id FROM users WHERE email = 'admin@fremio.com' LIMIT 1)
)
ON CONFLICT (id) DO NOTHING;

-- Sample test user
INSERT INTO users (email, password_hash, display_name, role)
VALUES (
    'test@fremio.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.M5nwZvvGNHhHxm', -- password: admin123
    'Test User',
    'user'
)
ON CONFLICT (email) DO NOTHING;

-- Verify seed
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data inserted successfully!';
END $$;
