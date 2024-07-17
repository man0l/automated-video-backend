import { Router } from 'express';
import { AppDataSource } from '../dataSource';
import { Scenario } from '../Entity/Scenario';
import { ParsedQs } from 'qs';

const router = Router();
const scenarioRepository = AppDataSource.getRepository(Scenario);

// Helper function to parse query parameters
const parseQueryParam = (param: string | string[] | ParsedQs | ParsedQs[] | undefined, type: 'number' | 'string' = 'string') => {
  if (Array.isArray(param)) {
    return param[0];
  }
  if (type === 'number' && typeof param === 'string') {
    return parseInt(param, 10);
  }
  return param;
};

// Get all scenarios with filters, sorting, and pagination
router.get('/scenarios', async (req, res) => {
  try {
    const {
      search,
      fromDate,
      toDate,
      status,
      sort,
      page,
      itemsPerPage,
    } = req.query;

    const parsedSort = parseQueryParam(sort) as string || 'DESC';
    const parsedPage = parseQueryParam(page, 'number') as number || 1;
    const parsedItemsPerPage = parseQueryParam(itemsPerPage, 'number') as number || 10;

    const query = scenarioRepository.createQueryBuilder('scenario')
      .leftJoinAndSelect('scenario.template', 'template');

    if (search) {
      query.andWhere('scenario.title LIKE :search OR scenario.description LIKE :search OR scenario.content LIKE :search', { search: `%${search}%` });
    }

    if (fromDate) {
      query.andWhere('scenario.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('scenario.createdAt <= :toDate', { toDate });
    }

    if (status) {
      query.andWhere('scenario.status = :status', { status });
    }

    query.orderBy('scenario.createdAt', parsedSort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

    query.skip((parsedPage - 1) * parsedItemsPerPage).take(parsedItemsPerPage);

    const scenarios = await query.getMany();
    const totalItems = await query.getCount();
    res.json({ scenarios, totalItems });
  } catch (error: any) {
    console.error('Error fetching scenarios from the database:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get a single scenario by ID
router.get('/scenarios/:id', async (req, res) => {
  try {
    const scenario = await scenarioRepository.findOne({
      where: { id: req.params.id },
      relations: ['template'],
    });
    if (scenario) {
      res.json(scenario);
    } else {
      res.status(404).json({ message: 'Scenario not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new scenario
router.post('/scenarios', async (req, res) => {
  try {
    const scenario = scenarioRepository.create(req.body);
    const result = await scenarioRepository.save(scenario);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update a scenario by ID
router.put('/scenarios/:id', async (req, res) => {
  try {
    const scenario = await scenarioRepository.findOneBy({ id: req.params.id });
    if (scenario) {
      scenarioRepository.merge(scenario, req.body);
      const result = await scenarioRepository.save(scenario);
      res.json(result);
    } else {
      res.status(404).json({ message: 'Scenario not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a scenario by ID
router.delete('/scenarios/:id', async (req, res) => {
  try {
    const result = await scenarioRepository.delete(req.params.id);
    if (result.affected) {
      res.json({ message: 'Scenario deleted successfully' });
    } else {
      res.status(404).json({ message: 'Scenario not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
