import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let TransactionController;

async function loadController() {
  if (!TransactionController) {
    const module = await import(path.join(__dirname, '../../backend/controllers/TransactionController.js'));
    TransactionController = module.default;
  }
  return TransactionController;
}

class TransactionHandler {
  static register(ipcMain) {
    ipcMain.handle('transactions:create', async (event, data) => {
      const controller = await loadController();
      return await controller.createTransaction(data);
    });

    ipcMain.handle('transactions:getAll', async (event, filters) => {
      const controller = await loadController();
      return await controller.getAllTransactions(filters);
    });

    ipcMain.handle('transactions:getById', async (event, id) => {
      const controller = await loadController();
      return await controller.getTransactionById(id);
    });

    ipcMain.handle('transactions:getDashboardStats', async (event, startDate, endDate) => {
      const controller = await loadController();
      return await controller.getDashboardStats(startDate, endDate);
    });
  }
}

export default TransactionHandler;
