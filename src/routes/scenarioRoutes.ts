import { Router } from 'express';
import { AppDataSource } from '../dataSource';
import { Scenario } from '../Entity/Scenario';

const router = Router();
const scenarioRepository = AppDataSource.getRepository(Scenario);

// Get all scenarios
router.get('/scenarios', async (req, res) => {
  try {
    const scenarios = await scenarioRepository.find({ relations: ['template'] });
    res.json(scenarios);
  } catch (error: any) {
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
