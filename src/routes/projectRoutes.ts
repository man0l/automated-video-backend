import { Router } from 'express';
import { AppDataSource } from '../dataSource';
import { Project } from '../Entity/Project';
import dotenv from 'dotenv';

const router = Router();
dotenv.config();

router.get('/projects', async (req, res) => {
    try {
        const projectRepository = AppDataSource.getRepository(Project);
        const projects = await projectRepository.find();
        res.json(projects);
    } catch (err) {
        console.error('Error loading projects', err);
        res.status(500).send('Error loading projects');
    }
});

export default router;
