import { Router } from 'express';
import { AppDataSource } from '../dataSource';
import { Template } from '../Entity/Template';

const router = Router();
const templateRepository = AppDataSource.getRepository(Template);

const parseQueryParam = (param: any, type: string = 'string') => {
  if (!param) return undefined;
  if (type === 'number') return Number(param);
  if (type === 'string') return String(param);
  return param;
};

// Get all templates with pagination, filtering, and sorting
router.get('/templates', async (req, res) => {
  try {
    const page = parseQueryParam(req.query.page, 'number') || 1;
    const itemsPerPage = parseQueryParam(req.query.itemsPerPage, 'number') || 10;
    const search = parseQueryParam(req.query.search);
    const sort = parseQueryParam(req.query.sort).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build query with pagination, filtering, and search
    let query = templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.scenarios', 'scenarios')
      .loadRelationCountAndMap('template.scenarioCount', 'template.scenarios')
      .skip((page - 1) * itemsPerPage)
      .take(itemsPerPage)
      .orderBy('template.createdAt', sort);

    if (search) {
      query = query.andWhere('template.title LIKE :search OR template.content LIKE :search', { search: `%${search}%` });
    }

    const [templates, totalItems] = await query.getManyAndCount();

    res.json({ templates, totalItems });
  } catch (error) {
    console.error('Error fetching templates from the database:', error);
    res.status(500).send('Error fetching templates from the database');
  }
});
// Get a single template by ID
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await templateRepository.findOneBy({ id: req.params.id  });
    if (template) {
      res.json(template);
    } else {
      res.status(404).json({ message: 'Template not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new template
router.post('/templates', async (req, res) => {
  try {
    const template = templateRepository.create(req.body);
    const result = await templateRepository.save(template);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update a template by ID
router.put('/templates/:id', async (req, res) => {
  try {
    const template = await templateRepository.findOneBy({ id: req.params.id });
    if (template) {
      templateRepository.merge(template, req.body);
      const result = await templateRepository.save(template);
      res.json(result);
    } else {
      res.status(404).json({ message: 'Template not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a template by ID
router.delete('/templates/:id', async (req, res) => {
  try {
    const result = await templateRepository.delete(req.params.id);
    if (result.affected) {
      res.json({ message: 'Template deleted successfully' });
    } else {
      res.status(404).json({ message: 'Template not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
