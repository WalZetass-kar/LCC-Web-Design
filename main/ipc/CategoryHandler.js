import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let CategoryController;

async function loadController() {
  if (!CategoryController) {
    const module = await import(path.join(__dirname, '../../backend/controllers/CategoryController.js'));
    CategoryController = module.default;
  }
  return CategoryController;
}

class CategoryHandler {
  static register(ipcMain) {
    ipcMain.handle('categories:getAll', async (event, activeOnly) => {
      const controller = await loadController();
      return await controller.getAllCategories(activeOnly);
    });

    ipcMain.handle('categories:getById', async (event, id) => {
      const controller = await loadController();
      return await controller.getCategoryById(id);
    });

    ipcMain.handle('categories:create', async (event, data) => {
      const controller = await loadController();
      return await controller.createCategory(data);
    });

    ipcMain.handle('categories:update', async (event, id, data) => {
      const controller = await loadController();
      return await controller.updateCategory(id, data);
    });

    ipcMain.handle('categories:delete', async (event, id) => {
      const controller = await loadController();
      return await controller.deleteCategory(id);
    });
  }
}

export default CategoryHandler;
