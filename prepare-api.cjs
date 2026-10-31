const fs=require('node:fs');
fs.mkdirSync('netlify-api/functions',{recursive:true});
fs.mkdirSync('netlify-api/public',{recursive:true});
fs.copyFileSync('rsvp-server.mjs','netlify-api/functions/rsvp.mjs');
fs.writeFileSync('netlify-api/public/_redirects','/api/* /.netlify/functions/rsvp/:splat 200\n');
fs.writeFileSync('netlify-api/public/index.html','<!doctype html><html lang="ru"><meta charset="utf-8"><title>Сервис анкет</title><p>Сервис свадебных анкет.</p><p><a href="/api/health">Проверить подключение</a></p></html>');
console.log('Wedding reply service prepared; no secrets are written to build files.');
