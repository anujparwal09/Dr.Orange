/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    FLASK_API_URL: process.env.FLASK_API_URL || 'https://dr-orange.onrender.com',
  },
};

module.exports = nextConfig;
