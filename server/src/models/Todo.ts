import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface ITodo extends Document {
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: Date;
  user: IUser['_id'];
  createdAt: Date;
  updatedAt: Date;
}

const todoSchema = new Schema<ITodo>(
  {
    title: { type: String, required: true },
    description: { type: String },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Todo = mongoose.model<ITodo>('Todo', todoSchema); 