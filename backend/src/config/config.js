const config = {
  port: process.env.PORT || 5000,
  dbUrl: process.env.MONGODB_URI || process.env.DB_URL || 'mongodb+srv://abrarmughal4481:1122@nobody.7d6kr.mongodb.net/vyapar?retryWrites=true&w=majority&appName=nobody',
};
export default config; 