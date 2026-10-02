import { createServer } from 'http';
import app, { connectDB } from './app.mjs';
import { initSocket } from './sockets/socketHandler.mjs';
import { initFirebase } from './config/firebase.mjs';
import { startHoldExpiryJob } from './services/holdExpiryService.mjs';
import { HOLD_SWEEP_ENABLED } from './config/holdConfig.mjs';

const PORT = process.env.PORT || 5000;
const server = createServer(app);

initSocket(server);
initFirebase();

const startServer = async () => {
  try {
    await connectDB();

    // Start only after the DB connection is up, otherwise the first sweep
    // races connection establishment and logs a buffer timeout.
    if (HOLD_SWEEP_ENABLED) {
      startHoldExpiryJob();
    } else {
      console.log('[holdExpiry] sweeper disabled via HOLD_SWEEP_ENABLED=false');
    }

    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.MODE_ENV || 'development'} mode on port: ${PORT}`);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();