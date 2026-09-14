-- Update password hashes for migrated users in the new Supabase project
-- Run this in your NEW Supabase project's SQL Editor:
-- https://supabase.com/dashboard/project/ybtbdtgtryrxrhuchlkw/sql/new

UPDATE auth.users 
SET encrypted_password = '$2a$10$nQqVGoYzssHdZPX0w/DKW.N8clgqqngcGPbAliwvDHcjNAzVqsRxy' 
WHERE id = 'c4345f99-4972-4434-a7a2-a0614566d105'; -- isaaclee6700@yahoo.com

UPDATE auth.users 
SET encrypted_password = '$2a$10$wn3kvy7RsNEWAs9YU/Cgj.3tGPLC3r/GiOlZ/hDMqiht4QkHLKGvK' 
WHERE id = '34af5f81-8830-40c6-a5ad-a6b199d02924'; -- ayushramola167@gmail.com

UPDATE auth.users 
SET encrypted_password = '$2a$10$st2mFYc3efQE3xcmrn7ON.RTu0lWdgo1bA86tl7C0htByAPLZfn3q' 
WHERE id = '6ae13a0f-f375-4057-be1f-07a78d2f31ae'; -- lehaanhphuoc0607@gmail.com

UPDATE auth.users 
SET encrypted_password = '$2a$10$jH87J24QNs8Pal8uP9boIukgh1Llf//wx5Fs7FsFctxbtzmrXvwVa' 
WHERE id = '0ed79507-62f8-4112-9ddb-4c5eda041671'; -- ggimang@gmail.com

UPDATE auth.users 
SET encrypted_password = '$2a$10$LFwcPYJihQOFNOdPtZsO5uq1ZasPVI..Hoh4YwPt4e.kQkDjifSu2' 
WHERE id = '4ea7ea88-ead9-4a2d-bffd-ee43b17be812'; -- shalomonwu@gmail.com

UPDATE auth.users 
SET encrypted_password = '$2a$10$JBJ7FcqdlZHlP6wtWPsJQ.8uhFhNAzBHmSwJA8msf8weQkTlVRryC' 
WHERE id = '81cc6ec8-56a7-446a-a40d-24dd5ad47869'; -- admin@streamnexus.com

UPDATE auth.users 
SET encrypted_password = '$2a$10$NrHqUSI3j0k9mX6GRVwnC.e61LVxLr/.8fFq4myPgE8JUTtNslteG' 
WHERE id = '66abdbfa-e142-48cf-9704-349c4d394d02'; -- ayushchandramola95@gmail.com

UPDATE auth.users 
SET encrypted_password = '$2a$10$JKX/YWF1N1MSAq6yu8KWKeTZfs2A42f3RCO.Jh3mSsTcm3dFaA5NG' 
WHERE id = '98f2a6cc-f20d-4a0b-a52a-1d8c4e8ba64b'; -- ldangdepzai1@gmail.com
