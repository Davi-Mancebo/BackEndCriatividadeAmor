import prisma from '../lib/prisma';

interface CreateSalesGoalData {
  month: number;
  year: number;
  targetValue: number;
  description?: string;
}

interface UpdateSalesGoalData {
  targetValue?: number;
  description?: string;
}

class SalesGoalsService {
  // Método privado para calcular progresso de vendas (DRY)
  private async calculateProgress(month: number, year: number, goal: any | null) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const salesData = await prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        status: {
          in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']
        }
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    });

    const currentValue = salesData._sum.total || 0;
    const orderCount = salesData._count.id;
    const targetValue = goal?.targetValue || 0;
    const percentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
    const remaining = targetValue - currentValue;

    return {
      currentValue,
      targetValue,
      percentage: Math.round(percentage * 100) / 100,
      remaining: remaining > 0 ? remaining : 0,
      orderCount,
      achieved: currentValue >= targetValue
    };
  }

  async create(data: CreateSalesGoalData) {
    return await prisma.salesGoal.create({
      data
    });
  }

  async getCurrent() {
    const now = new Date();
    const month = now.getMonth() + 1; // getMonth() retorna 0-11
    const year = now.getFullYear();

    const goal = await prisma.salesGoal.findUnique({
      where: {
        month_year: {
          month,
          year
        }
      }
    });

    const progress = await this.calculateProgress(month, year, goal);

    return {
      goal,
      progress
    };
  }

  async getByMonthYear(month: number, year: number) {
    const goal = await prisma.salesGoal.findUnique({
      where: {
        month_year: {
          month,
          year
        }
      }
    });

    if (!goal) {
      throw new Error('Meta não encontrada');
    }

    const progress = await this.calculateProgress(month, year, goal);

    return {
      goal,
      progress
    };
  }

  async list() {
    return await prisma.salesGoal.findMany({
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });
  }

  async update(month: number, year: number, data: UpdateSalesGoalData) {
    // Usar upsert para criar se não existir
    return await prisma.salesGoal.upsert({
      where: {
        month_year: {
          month,
          year
        }
      },
      update: data,
      create: {
        month,
        year,
        targetValue: data.targetValue || 10000,
        description: data.description
      }
    });
  }

  async delete(month: number, year: number) {
    return await prisma.salesGoal.delete({
      where: {
        month_year: {
          month,
          year
        }
      }
    });
  }

  async deleteById(id: string) {
    return await prisma.salesGoal.delete({
      where: { id }
    });
  }
}

export default new SalesGoalsService();
