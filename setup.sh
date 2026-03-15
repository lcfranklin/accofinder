#!/bin/bash

echo "Initializing npm project if not already initialized..."
npm init -y

echo "Setting up nodemon for development in package.json..."
npx json -I -f package.json -e '
this.scripts = {
  "test": "echo \"Error: no test specified\" && exit 1",
    "start:dev" : "nodemon ./src/index.mjs",
    "start": "node ./src/index.mjs"
}
'

echo "Installing essential dependencies..."
npm install express mongoose dotenv jsonwebtoken bcryptjs cors helmet morgan \
    express-validator joi yup stripe \
    nodemailer socket.io cookie-parser multer bcrypt sharp

echo "Installing development dependencies..."
npm install --save-dev nodemon

echo "Creating .env file..."
cat <<EOT > .env
PORT=5000
MONGO_URI_CAMPUS=mongodb://localhost:27017/db_name

EOT

echo "Setup complete. Run the server with: npm run start:dev"
