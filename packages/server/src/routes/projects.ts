/**
 * 项目管理路由
 */
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router: Router = Router();

// 生成 DSN
function generateDSN(): string {
  return crypto.randomBytes(8).toString('hex');
}

/** 获取用户的项目列表 */
router.get('/projects', authMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 获取用户拥有的项目 + 参与的项目
    const result = await query(`
      SELECT DISTINCT p.*, 
        CASE WHEN p.owner_id = $1 THEN 'owner' ELSE pm.role END as user_role,
        (SELECT COUNT(*) FROM errors WHERE dsn = p.dsn) as error_count,
        (SELECT COUNT(*) FROM performance WHERE dsn = p.dsn) as perf_count
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
      WHERE p.owner_id = $1 OR pm.user_id = $1
      ORDER BY p.created_at DESC
    `, [userId]);

    res.json({ projects: result.rows });
  } catch (error) {
    console.error('[Projects] List failed:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

/** 创建项目 */
router.post('/projects', authMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, description, platform = 'web' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const dsn = generateDSN();
    
    const result = await query(`
      INSERT INTO projects (dsn, name, description, platform, owner_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [dsn, name, description || null, platform, userId]);

    res.status(201).json({ project: result.rows[0] });
  } catch (error) {
    console.error('[Projects] Create failed:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/** 获取项目详情 */
router.get('/projects/:id', authMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectId = req.params.id;

  try {
    // 检查权限
    const projectResult = await query(`
      SELECT p.*, 
        CASE WHEN p.owner_id = $2 THEN 'owner' ELSE pm.role END as user_role
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
      WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)
    `, [projectId, userId]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // 获取项目成员
    const membersResult = await query(`
      SELECT u.id, u.email, u.name, pm.role, pm.created_at as joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `, [projectId]);

    // 获取项目统计
    const statsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM errors WHERE dsn = $1) as error_count,
        (SELECT COUNT(*) FROM performance WHERE dsn = $1) as perf_count,
        (SELECT COUNT(DISTINCT fingerprint) FROM errors WHERE dsn = $1) as error_groups
    `, [project.dsn]);

    res.json({
      project,
      members: membersResult.rows,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('[Projects] Get failed:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

/** 更新项目 */
router.patch('/projects/:id', authMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectId = req.params.id;
  const { name, description, platform } = req.body;

  try {
    // 检查是否是项目所有者
    const checkResult = await query(
      'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
      [projectId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only project owner can update' });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (platform) {
      updates.push(`platform = $${paramIndex++}`);
      values.push(platform);
    }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(projectId as unknown as number);
    const result = await query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('[Projects] Update failed:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/** 删除项目 */
router.delete('/projects/:id', authMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectId = req.params.id;

  try {
    // 检查是否是项目所有者
    const checkResult = await query(
      'SELECT dsn FROM projects WHERE id = $1 AND owner_id = $2',
      [projectId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only project owner can delete' });
    }

    const dsn = checkResult.rows[0].dsn;

    // 删除相关数据
    await query('DELETE FROM errors WHERE dsn = $1', [dsn]);
    await query('DELETE FROM performance WHERE dsn = $1', [dsn]);
    await query('DELETE FROM sourcemaps WHERE dsn = $1', [dsn]);
    await query('DELETE FROM projects WHERE id = $1', [projectId]);

    res.json({ success: true });
  } catch (error) {
    console.error('[Projects] Delete failed:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/** 添加项目成员 */
router.post('/projects/:id/members', authMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectId = req.params.id;
  const { email, role = 'member' } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // 检查是否是项目所有者
    const checkResult = await query(
      'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
      [projectId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only project owner can add members' });
    }

    // 查找用户
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const memberId = userResult.rows[0].id;

    // 添加成员
    await query(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3
    `, [projectId, memberId, role]);

    res.json({ success: true });
  } catch (error) {
    console.error('[Projects] Add member failed:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

/** 移除项目成员 */
router.delete('/projects/:id/members/:memberId', authMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectId = req.params.id;
  const memberId = req.params.memberId;

  try {
    // 检查是否是项目所有者
    const checkResult = await query(
      'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
      [projectId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only project owner can remove members' });
    }

    await query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, memberId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Projects] Remove member failed:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

/** 重新生成 DSN */
router.post('/projects/:id/regenerate-dsn', authMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectId = req.params.id;

  try {
    // 检查是否是项目所有者
    const checkResult = await query(
      'SELECT dsn FROM projects WHERE id = $1 AND owner_id = $2',
      [projectId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only project owner can regenerate DSN' });
    }

    const oldDsn = checkResult.rows[0].dsn;
    const newDsn = generateDSN();

    // 更新项目 DSN
    await query('UPDATE projects SET dsn = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newDsn, projectId]);
    
    // 更新相关数据的 DSN
    await query('UPDATE errors SET dsn = $1 WHERE dsn = $2', [newDsn, oldDsn]);
    await query('UPDATE performance SET dsn = $1 WHERE dsn = $2', [newDsn, oldDsn]);
    await query('UPDATE sourcemaps SET dsn = $1 WHERE dsn = $2', [newDsn, oldDsn]);

    res.json({ dsn: newDsn });
  } catch (error) {
    console.error('[Projects] Regenerate DSN failed:', error);
    res.status(500).json({ error: 'Failed to regenerate DSN' });
  }
});

export default router;
