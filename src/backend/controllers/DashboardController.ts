import { DashboardModel } from '../models/DashboardModel.js'

export class DashboardController {
  static getSummary() {
    return { success: true, data: DashboardModel.getSummary() }
  }
}
