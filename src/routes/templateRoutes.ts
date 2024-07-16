import { Router } from 'express';
import { AppDataSource } from '../dataSource';
import { Template } from '../Entity/Template';

const router = Router();
const templateRepository = AppDataSource.getRepository(Template);

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await templateRepository.find();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
