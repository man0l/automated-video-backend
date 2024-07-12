import { Router } from 'express';
import { AppDataSource } from '../dataSource';
import { Project, ProjectStatus } from '../Entity/Project';
import dotenv from 'dotenv';
import { Between, ILike, FindOptionsOrderValue } from 'typeorm';

const router = Router();
dotenv.config();

router.get('/projects', async (req, res) => {
    try {
        const projectRepository = AppDataSource.getRepository(Project);

        const { search, fromDate, toDate, stage, sort = 'desc', page = 1, itemsPerPage = 10 } = req.query;

        let where: any = {};

        if (search) {
            where.name = ILike(`%${search}%`);
        }

        if (fromDate && toDate) {
            where.createdAt = Between(new Date(fromDate as string), new Date(toDate as string));
        }

        if (stage) {
            where.status = stage;
        }

        const order: { createdAt: FindOptionsOrderValue } = {
            createdAt: sort === 'asc' ? 'ASC' : 'DESC'
        };

        const [projects, totalProjects] = await projectRepository.findAndCount({
            where,
            order,
            skip: (Number(page) - 1) * Number(itemsPerPage),
            take: Number(itemsPerPage),
        });

        res.json({ projects, totalProjects });
    } catch (err) {
        console.error('Error loading projects', err);
        res.status(500).send('Error loading projects');
    }
});

router.put('/projects/:id', async (req, res) => {
    const { id } = req.params;
    const { name, color, status } = req.body;

    try {
        const projectRepository = AppDataSource.getRepository(Project);

        const project = await projectRepository.findOneBy({ id });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (name) project.name = name;
        if (color) project.color = color;
        if (status && Object.values(ProjectStatus).includes(status)) {
            project.status = status;
        }

        project.updatedAt = new Date();

        await projectRepository.save(project);

        res.json(project);
    } catch (err) {
        console.error('Error updating project', err);
        res.status(500).send('Error updating project');
    }
});

export default router;
