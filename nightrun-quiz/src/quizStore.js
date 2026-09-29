'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TIME_LIMITS = [10, 20, 30];
const MAX_QUESTIONS = 100;
const MAX_TEXT = 300;
const MAX_OPTION = 120;
const MAX_TITLE = 120;

class ValidationError extends Error {
  constructor(code, index) {
    super(code);
    this.code = code;
    this.index = index; // 1-based question number, when relevant
  }
}

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

// Only allow images we host ourselves or plain http(s) URLs.
function cleanImage(v) {
  const s = str(v);
  if (!s) return '';
  if (/^\/uploads\/[\w.-]+$/.test(s) || /^https?:\/\/\S+$/i.test(s)) return s.slice(0, 1000);
  return '';
}

// Validates and normalizes a quiz payload coming from the host panel.
// Throws ValidationError with a code the client translates.
function normalizeQuiz(input) {
  if (!input || typeof input !== 'object') throw new ValidationError('title_required');
  const title = str(input.title).slice(0, MAX_TITLE);
  if (!title) throw new ValidationError('title_required');
  const qs = Array.isArray(input.questions) ? input.questions : [];
  if (qs.length === 0) throw new ValidationError('questions_required');
  if (qs.length > MAX_QUESTIONS) throw new ValidationError('too_many_questions');

  const questions = qs.map((q, i) => {
    const n = i + 1;
    q = q || {};
    const text = str(q.text).slice(0, MAX_TEXT);
    if (!text) throw new ValidationError('question_text_required', n);
    const options = Array.isArray(q.options) ? q.options.map((o) => str(o).slice(0, MAX_OPTION)) : [];
    if (options.length !== 4 || options.some((o) => !o)) throw new ValidationError('options_required', n);
    const correct = Number(q.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) throw new ValidationError('invalid_correct', n);
    const timeLimit = Number(q.timeLimit);
    if (!TIME_LIMITS.includes(timeLimit)) throw new ValidationError('invalid_time', n);
    return { text, options, correct, timeLimit, image: cleanImage(q.image) };
  });

  return { title, questions };
}

class QuizStore {
  constructor(file) {
    this.file = file;
    this.quizzes = this._load();
  }

  _load() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return Array.isArray(data.quizzes) ? data.quizzes : [];
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw new Error(`Cannot read quiz file ${this.file}: ${err.message}`);
    }
  }

  // Write to a temp file and rename, so a crash never leaves a half-written file.
  _save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ quizzes: this.quizzes }, null, 2) + '\n');
    fs.renameSync(tmp, this.file);
  }

  list() {
    return this.quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      questionCount: q.questions.length,
      updatedAt: q.updatedAt,
    }));
  }

  get(id) {
    return this.quizzes.find((q) => q.id === id) || null;
  }

  create(input) {
    const now = new Date().toISOString();
    const quiz = { id: crypto.randomUUID(), ...normalizeQuiz(input), createdAt: now, updatedAt: now };
    this.quizzes.push(quiz);
    this._save();
    return quiz;
  }

  update(id, input) {
    const idx = this.quizzes.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    const quiz = { ...this.quizzes[idx], ...normalizeQuiz(input), updatedAt: new Date().toISOString() };
    this.quizzes[idx] = quiz;
    this._save();
    return quiz;
  }

  remove(id) {
    const before = this.quizzes.length;
    this.quizzes = this.quizzes.filter((q) => q.id !== id);
    if (this.quizzes.length === before) return false;
    this._save();
    return true;
  }
}

module.exports = { QuizStore, ValidationError, normalizeQuiz, TIME_LIMITS };
