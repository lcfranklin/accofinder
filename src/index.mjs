// index.mjs
import { createServer } from 'http';
import app, { connectDB } from './app.mjs';
import { initSocket } from './sockets/socketHandler.mjs';

const PORT = process.env.PORT || 5000;
const server = createServer(app);

initSocket(server);

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.MODE_ENV || 'development'} mode on port: ${PORT}`);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();