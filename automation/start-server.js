const ReviewConsoleServer = require('./review-console/server');

console.log('🌟 Starting Smart Finance Hub Review Console...');
console.log('⏰ Started at:', new Date().toLocaleString());

const server = new ReviewConsoleServer();
server.start();

// Keep the process running
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server terminated');
    process.exit(0);
});
