import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let ProductController;

async function loadController() {
  if (!ProductController) {
    const module = await import(path.join(__dirname, '../../backend/controllers/ProductController.js'));
    ProductController = module.default;
  }
  return ProductController;
}

class ProductHandler {
  static register(ipcMain) {
    ipcMain.handle('products:getAll', async (event, filters) => {
      const controller = await loadController();
      return await controller.getAllProducts(filters);
    });

    ipcMain.handle('products:getById', async (event, id) => {
      const controller = await loadController();
      return await controller.getProductById(id);
    });

    ipcMain.handle('products:getUnits', async () => {
      const controller = await loadController();
      return await controller.getAllUnits();
    });

    ipcMain.handle('products:create', async (event, data) => {
      const controller = await loadController();
      return await controller.createProduct(data);
    });

    ipcMain.handle('products:update', async (event, id, data) => {
      const controller = await loadController();
      return await controller.updateProduct(id, data);
    });

    ipcMain.handle('products:delete', async (event, id) => {
      const controller = await loadController();
      return await controller.deleteProduct(id);
    });

    ipcMain.handle('products:updateStock', async (event, id, quantity) => {
      const controller = await loadController();
      return await controller.updateStock(id, quantity);
    });
  }
}

export default ProductHandler;
