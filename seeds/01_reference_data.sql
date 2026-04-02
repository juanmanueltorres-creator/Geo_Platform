-- =====================================================
-- 01_BASE_CATALOGS.sql
-- Ejecutar una sola vez (o usar ON CONFLICT si lo repetís)
-- =====================================================

INSERT INTO elements (symbol, name, default_unit) VALUES
('Au', 'Gold', 'ppm'),
('Ag', 'Silver', 'ppm'),
('Cu', 'Copper', '%'),
('Mo', 'Molybdenum', 'ppm'),
('As', 'Arsenic', 'ppm'),
('Pb', 'Lead', 'ppm'),
('Zn', 'Zinc', 'ppm')
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO laboratories (name, accreditation) VALUES
('ALS Mendoza', 'ISO 17025'),
('SGS Chile', 'ISO 17025')
ON CONFLICT (name) DO NOTHING;

INSERT INTO assay_methods (code, description, detection_limit, unit) VALUES
('FA_AAS', 'Fire Assay AAS finish', 0.001, 'ppm'),
('ICP_MS', 'ICP-MS multi-element', 0.1, 'ppm'),
('XRF', 'X-Ray Fluorescence', 0.01, '%')
ON CONFLICT (code) DO NOTHING;

INSERT INTO qaqc_types (name) VALUES
('PRIMARY'),
('STANDARD'),
('BLANK'),
('DUPLICATE')
ON CONFLICT (name) DO NOTHING;

INSERT INTO lithologies (code, name, description) VALUES
('AND', 'Andesite', 'Intermediate volcanic rock'),
('BRX', 'Hydrothermal Breccia', 'Fragmental rock cemented by hydrothermal fluids'),
('DIO', 'Diorite', 'Intermediate intrusive rock'),
('TUF', 'Tuff', 'Pyroclastic volcanic rock'),
('VEIN', 'Quartz Vein', 'Quartz-dominant hydrothermal vein')
ON CONFLICT (code) DO NOTHING;

INSERT INTO alteration_types (code, name, description) VALUES
('POT', 'Potassic', 'K-feldspar and/or biotite alteration'),
('PHY', 'Phyllic', 'Sericite + quartz alteration'),
('ARG', 'Argillic', 'Clay-dominant alteration'),
('PRO', 'Propylitic', 'Chlorite + epidote alteration'),
('SIL', 'Silicification', 'Silica flooding or replacement')
ON CONFLICT (code) DO NOTHING;

INSERT INTO mineralization_types (code, name, description) VALUES
('DIS', 'Disseminated', 'Fine-grained disseminated sulfides'),
('STK', 'Stockwork', 'Veinlet network mineralization'),
('VEIN', 'Vein-hosted', 'Mineralization in discrete veins'),
('BREC', 'Breccia-hosted', 'Mineralization in hydrothermal breccia')
ON CONFLICT (code) DO NOTHING;