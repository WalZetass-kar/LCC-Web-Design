import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let AuthController;

async function loadController() {
  if (!AuthController) {
    const module = await import(path.join(__dirname, '../../backend/controllers/AuthController.js'));
    AuthController = module.default;
  }
  return AuthController;
}

class AuthHandler {
  static register(ipcMain) {
    ipcMain.handle('auth:login', async (event, username, password) => {
      const controller = await loadController();
      return await controller.login(username, password);
    });

    ipcMain.handle('auth:getUserById', async (event, userId) => {
      const controller = await loadController();
      return await controller.getUserById(userId);
    });
  }
}

export default AuthHandler;
