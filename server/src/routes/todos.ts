import express from 'express';
import { Todo } from '../models/Todo';
import { AuthRequest } from '../middleware/auth';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Get all todos for the authenticated user
router.get('/', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const todos = await Todo.find({ user: req.user._id });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching todos' });
  }
});

// Create a new todo
router.post('/', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const todo = await Todo.create({
      ...req.body,
      user: req.user._id,
    });
    res.status(201).json(todo);
  } catch (error) {
    res.status(500).json({ message: 'Error creating todo' });
  }
});

// Update a todo
router.put('/:id', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: 'Error updating todo' });
  }
});

// Delete a todo
router.delete('/:id', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const todo = await Todo.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting todo' });
  }
});

export default router; 