const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes, where } = require('sequelize');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const fs = require('fs');
const cron = require('node-cron');
const { exec } = require('child_process');
const app = express();
app.use(cors());
app.use(bodyParser.json());

// 提供静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 连接 SQL Server
const sequelize = new Sequelize('QAsystem', 'sa', '252011', {
  host: 'localhost',
  dialect: 'mssql'
});

// 测试数据库连接
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// 定义 teacher 模型
const Teacher = sequelize.define('Teacher', {
  userid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'Teacher'
});

// 定义 student 模型
const Student = sequelize.define('Student', {
  userid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'Student'
});

// 定义 course 模型
const Course = sequelize.define('Course', {
  courseid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  coursename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  teacherid: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Teacher',
      key: 'userid',
    },
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  property: {
    type: DataTypes.STRING,
    allowNull: false
  },
  assistant: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Student',
      key: 'userid'
    }
  }
}, {
  tableName: 'Course'
});

// 定义 question 模型
const Question = sequelize.define('Question', {
  questionid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  studentid: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Student',
      key: 'userid',
    },
  },
  courseid: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Course',
      key: 'courseid',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  tags: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  images: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['open', 'locked', 'pending']]
    }
  },
  pendingTime: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'Question'
});

const Reply = sequelize.define('Reply', {
  replyid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  questionid: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Question',
      key: 'questionid',
    }
  },
  senderid: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['student', 'teacher']]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  like: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  images: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'Reply'
});

const Knowledge = sequelize.define('Knowledge', {
  knowledgeid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uploaderid: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  courseid: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Course',
      key: 'courseid'
    }
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  relations: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isKb: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
}, {
  tableName: 'Knowledge'
});

const Notification = sequelize.define('Notification', {
  notificationid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  receiverid: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['student', 'teacher']]
    }
  },
  questionid: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Question',
      key: 'questionid'
    }
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  }
}, {
  tableName: 'Notification'
});

const Favorite = sequelize.define('Favorite', {
  favoriteid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studentid: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Student',
      key: 'userid'
    },
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION'
  },
  questionid: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Question',
      key: 'questionid'
    },
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION'
  }
}, {
  tableName: 'Favorite'
});

// 定义模型之间的关系
Teacher.hasMany(Course, { foreignKey: 'teacherid' });
Course.belongsTo(Teacher, { foreignKey: 'teacherid' });

Student.hasMany(Question, { foreignKey: 'studentid' });
Question.belongsTo(Student, { foreignKey: 'studentid' });

Course.hasMany(Question, { foreignKey: 'courseid' });
Question.belongsTo(Course, { foreignKey: 'courseid' });

Question.hasMany(Reply, { foreignKey: 'questionid' });
Reply.belongsTo(Question, { foreignKey: 'questionid' });

Student.hasMany(Reply, { foreignKey: 'senderid', constraints: false });
Reply.belongsTo(Student, { foreignKey: 'senderid', constraints: false });

Teacher.hasMany(Reply, { foreignKey: 'senderid', constraints: false });
Reply.belongsTo(Teacher, { foreignKey: 'senderid', constraints: false });

Teacher.hasMany(Knowledge, { foreignKey: 'uploaderid', constraints: false });
Knowledge.belongsTo(Teacher, { foreignKey: 'uploaderid', constraints: false });

Student.hasMany(Knowledge, { foreignKey: 'uploaderid', constraints: false });
Knowledge.belongsTo(Student, { foreignKey: 'uploaderid', constraints: false });

Course.belongsTo(Student, { foreignKey: 'assistant' });
Student.hasMany(Course, { foreignKey: 'assistant' });

Notification.belongsTo(Student, { foreignKey: 'receiverid', constraints: false });
Student.hasMany(Notification, { foreignKey: 'receiverid', constraints: false });

Notification.belongsTo(Teacher, { foreignKey: 'receiverid', constraints: false });
Teacher.hasMany(Notification, { foreignKey: 'receiverid', constraints: false });

Favorite.belongsTo(Question, { foreignKey: 'questionid' });
Question.hasMany(Favorite, { foreignKey: 'questionid' });

Favorite.belongsTo(Student, { foreignKey: 'studentid' });
Student.hasMany(Favorite, { foreignKey: 'studentid' });

Student.belongsToMany(Question, { through: Favorite, foreignKey: 'studentid' });
Question.belongsToMany(Student, { through: Favorite, foreignKey: 'questionid' });

// 同步所有模型
sequelize.sync({ alter: true }).then(() => {
  console.log('Database & tables created!');
});

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 增删改查操作的路由

// 增加 teacher
app.post('/api/users/teachers', async (req, res) => {
  const teacher = await Teacher.create(req.body);
  res.status(200).json(teacher);
});

// 获取所有 teachers
app.get('/api/users/teachers', async (req, res) => {
  const teachers = await Teacher.findAll();
  res.status(200).json(teachers);
});

// 更新 teacher
app.put('/api/users/teachers/:userid', async (req, res) => {
  const { userid } = req.params;
  const [updated] = await Teacher.update(req.body, {
    where: { userid: userid }
  });
  if (updated) {
    const updatedTeacher = await Teacher.findOne({ where: { userid: userid } });
    res.status(200).json(updatedTeacher);
  } else {
    res.status(404).send('Teacher not found');
  }
});

// 删除 teacher
app.delete('/api/users/teachers/:userid', async (req, res) => {
  const { userid } = req.params;
  const deleted = await Teacher.destroy({
    where: { userid: userid }
  });
  if (deleted) {
    res.status(200).send();
  } else {
    res.status(404).send('Teacher not found');
  }
});

// 增加 student
app.post('/api/users/students', async (req, res) => {
  const student = await Student.create(req.body);
  res.status(200).json(student);
});

// 获取所有 students
app.get('/api/users/students', async (req, res) => {
  const students = await Student.findAll();
  res.status(200).json(students);
});

// 更新 student
app.put('/api/users/students/:userid', async (req, res) => {
  const { userid } = req.params;
  const [updated] = await Student.update(req.body, {
    where: { userid: userid }
  });
  if (updated) {
    const updatedStudent = await Student.findOne({ where: { userid: userid } });
    res.status(200).json(updatedStudent);
  } else {
    res.status(404).send('Student not found');
  }
});

// 删除 student
app.delete('/api/users/students/:userid', async (req, res) => {
  const { userid } = req.params;
  const deleted = await Student.destroy({
    where: { userid: userid }
  });
  if (deleted) {
    res.status(200).send();
  } else {
    res.status(404).send('Student not found');
  }
});

// 增加 course
app.post('/api/courses', async (req, res) => {
  const course = await Course.create(req.body);
  res.status(200).json(course);
});

// 获取所有 courses
app.get('/api/courses', async (req, res) => {
  const { teacherid, studentid } = req.query;
  try {
    if (teacherid) {
      const courses = await Course.findAll({
        where: { teacherid: teacherid },
        include: [{
          model: Student,
          attributes: ['username']
        }]
      });
      res.status(200).json(courses);
    } else {
      const courses = await Course.findAll({
        include: [{
          model: Teacher,
          attributes: ['username']
        }]
      });
      res.status(200).json(courses);
    }
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 更新 course
app.put('/api/courses/:courseid', async (req, res) => {
  const { courseid } = req.params;
  try {
    const [updated] = await Course.update(req.body, {
      where: { courseid: courseid }
    });
    if (updated) {
      const updatedCourse = await Course.findOne({
        where: { courseid: courseid },
        include: [{
          model: Student,
          attributes: ['username']
        }]
      });
      res.status(200).json(updatedCourse);
    } else {
      res.status(404).send('Course not found');
    }
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 删除 course
app.delete('/api/courses/:courseid', async (req, res) => {
  const { courseid } = req.params;
  const transaction = await sequelize.transaction();
  try {
    const questions = await Question.findAll({
      where: { courseid: courseid },
      transaction
    });
    for (const question of questions) {
      const replies = await Reply.findAll({
        where: { questionid: question.questionid },
        transaction
      });
      for (const reply of replies) {
        const images = JSON.parse(reply.images);
        for (const image of images) {
          const fullPath = path.join(__dirname, image);
          fs.unlink(fullPath, (err) => {
            if (err) {
              throw new Error(`Error deleting file: ${image}`);
            }
          });
        }
        await Reply.destroy({
          where: { replyid: reply.replyid },
          transaction
        });
      }
      const images = JSON.parse(question.images);
      for (const image of images) {
        const fullPath = path.join(__dirname, image);
        fs.unlink(fullPath, (err) => {
          if (err) {
            throw new Error(`Error deleting file: ${image}`);
          }
        });
      }
    }
    await Question.destroy({
      where: { courseid: courseid },
      transaction
    });
    const knowledgeFiles = await Knowledge.findAll({
      where: { courseid: courseid },
      transaction
    });
    for (const file of knowledgeFiles) {
      const fullPath = path.join(__dirname, file.path);
      fs.unlink(fullPath, (err) => {
        if (err) {
          throw new Error(`Error deleting file: ${file.path}`);
        }
      });
      await Knowledge.destroy({
        where: { knowledgeid: file.knowledgeid },
        transaction
      });
    }
    const deleted = await Course.destroy({
      where: { courseid: courseid },
      transaction
    });
    if (deleted) {
      await transaction.commit();
      res.status(200).send();
    } else {
      await transaction.rollback();
      res.status(400).send('Course not found');
    }
  } catch (err) {
    await transaction.rollback();
    console.error('Error deleting course and related data:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 上传图片
app.post('/api/upload', upload.array('images', 3), (req, res) => {
  const fileUrls = req.files.map(file => `/uploads/${file.filename}`);
  res.status(200).json({ urls: fileUrls });
});

// 删除文件
app.delete('/api/upload', async (req, res) => {
  const { filePath } = req.body;
  try {
    const fullPath = path.join(__dirname, filePath);
    fs.unlink(fullPath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return res.status(400).json({ message: 'Internal server error' });
      }
      res.status(200).json({ message: 'File deleted successfully' });
    });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 增加 question
app.post('/api/questions', async (req, res) => {
  try {
    const question = await Question.create(req.body);
    res.status(200).json(question);
  } catch (err) {
    console.error('Error creating question:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 获取多个课程下的所有 questions，并包含关联的学生信息
app.get('/api/questions', async (req, res) => {
  const { courseIds, status, studentid, questionid } = req.query;
  try {
    const whereClause = {};
    if (courseIds) {
      whereClause.courseid = courseIds.split(',');
    }
    if (status) {
      whereClause.status = status;
    }
    if (studentid) {
      whereClause.studentid = studentid;
    }
    if (questionid) {
      whereClause.questionid = questionid;
    }
    const questions = await Question.findAll({
      where: whereClause,
      include: [{
        model: Student,
        attributes: ['username', 'nickname', 'avatar']
      }, {
        model: Course,
        attributes: ['coursename', 'teacherid']
      }]
    });
    const parsedQuestions = questions.map(question => {
      return {
        ...question.toJSON(),
        tags: question.tags ? JSON.parse(question.tags) : [],
        images: question.images ? JSON.parse(question.images) : []
      };
    });
    res.status(200).json(parsedQuestions);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 获取每个课程的问题数量
app.get('/api/questions/count', async (req, res) => {
  const { courseIds } = req.query;
  try {
    const whereClause = courseIds ? { courseid: courseIds.split(',') } : {};
    const questionCounts = await Question.findAll({
      attributes: ['courseid', [sequelize.fn('COUNT', sequelize.col('questionid')), 'questionCount']],
      where: whereClause,
      group: ['courseid']
    });
    res.status(200).json(questionCounts);
  } catch (err) {
    console.error('Error fetching question counts:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 更新 question
app.put('/api/questions/:questionid', async (req, res) => {
  const { questionid } = req.params;
  const [updated] = await Question.update(req.body, {
    where: { questionid: questionid }
  });
  if (updated) {
    const updatedQuestion = await Question.findOne({ where: { questionid: questionid } });
    const parsedQuestion = {
      ...updatedQuestion.toJSON(),
      tags: updatedQuestion.tags ? JSON.parse(updatedQuestion.tags) : [],
      images: updatedQuestion.images ? JSON.parse(updatedQuestion.images) : []
    };
    res.status(200).json(parsedQuestion);
  } else {
    res.status(400).send('Question not found');
  }
});

// 删除 question
app.delete('/api/questions/:questionid', async (req, res) => {
  const { questionid } = req.params;
  const transaction = await sequelize.transaction();
  try {
    const replies = await Reply.findAll({
      where: { questionid: questionid },
      transaction
    });
    for (const reply of replies) {
      const images = JSON.parse(reply.images);
      for (const image of images) {
        const fullPath = path.join(__dirname, image);
        fs.unlink(fullPath, (err) => {
          if (err) {
            throw new Error(`Error deleting file: ${image}`);
          }
        });
      }
      await Reply.destroy({
        where: { replyid: reply.replyid },
        transaction
      });
    }
    const question = await Question.findOne({
      where: { questionid: questionid },
      transaction
    });
    const images = JSON.parse(question.images);
    for (const image of images) {
      const fullPath = path.join(__dirname, image);
      fs.unlink(fullPath, (err) => {
        if (err) {
          throw new Error(`Error deleting file: ${image}`);
        }
      });
    }
    await Notification.destroy({
      where: { questionid: questionid },
      transaction
    });
    const deleted = await Question.destroy({
      where: { questionid: questionid },
      transaction
    });
    if (deleted) {
      await transaction.commit();
      res.status(200).send();
    } else {
      await transaction.rollback();
      res.status(400).send('Question not found');
    }
  } catch (err) {
    await transaction.rollback();
    console.error('Error deleting question and related data:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 获取每个问题的回复数量
app.get('/api/replies/count', async (req, res) => {
  const { questionIds } = req.query;
  try {
    const whereClause = questionIds ? { questionid: questionIds.split(',') } : {};
    const replyCounts = await Reply.findAll({
      attributes: ['questionid', [sequelize.fn('COUNT', sequelize.col('replyid')), 'replyCount']],
      where: whereClause,
      group: ['questionid']
    });
    res.status(200).json(replyCounts);
  } catch (err) {
    console.error('Error fetching reply counts:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 获取特定 questionid 下的所有 replies
app.get('/api/replies', async (req, res) => {
  const { questionid } = req.query;
  if (!questionid) {
    return res.status(400).json({ message: 'Missing questionid parameter' });
  }

  try {
    const replies = await Reply.findAll({
      where: { questionid: questionid },
      include: [
        {
          model: Student,
          attributes: ['username', 'nickname', 'avatar'],
          required: false
        },
        {
          model: Teacher,
          attributes: ['username', 'avatar'],
          required: false
        }
      ]
    });
    const parsedReplies = replies.map(reply => {
      return {
        ...reply.toJSON(),
        images: reply.images ? JSON.parse(reply.images) : []
      };
    });
    res.status(200).json(parsedReplies);
  } catch (err) {
    console.error('Error fetching replies:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 增加 reply
app.post('/api/replies', async (req, res) => {
  try {
    const reply = await Reply.create(req.body);
    res.status(200).json(reply);
  } catch (err) {
    console.error('Error creating reply:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 更新 reply 的 like 字段
app.put('/api/replies/:replyid/like', async (req, res) => {
  const { replyid } = req.params;
  const { like } = req.body;

  try {
    const [updated] = await Reply.update({ like: like }, {
      where: { replyid: replyid }
    });

    if (updated) {
      const updatedReply = await Reply.findOne({ where: { replyid: replyid } });
      const parsedReply = {
        ...updatedReply.toJSON(),
        images: updatedReply.images ? JSON.parse(updatedReply.images) : []
      };
      res.status(200).json(parsedReply);
    } else {
      res.status(404).send('Reply not found');
    }
  } catch (err) {
    console.error('Error updating reply like:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 上传文件
app.post('/api/knowledge/upload', upload.single('file'), async (req, res) => {
  const { uploaderid, courseid, type, filename, isKb } = req.body;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  try {
    const knowledge = await Knowledge.create({
      uploaderid: uploaderid,
      courseid: courseid,
      filename: filename,
      size: file.size,
      type: type,
      path: file.path,
      isKb: isKb === 'true'
    });
    if (isKb == 'true') {
      const base_path = path.join('vectorstore', courseid.toString());
      exec(`python Process.py ${base_path} ${file.path}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing Python script: ${error.message}`);
          return res.status(500).json({ message: 'Internal server error' });
        }
        if (stderr) {
          console.error(`Python script stderr: ${stderr}`);
        }
        else console.log(`Python script stdout: ${stdout}`);
        res.status(200).json(knowledge);
      });
    }
    else res.status(200).json(knowledge);
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 获取多个课程下的所有 knowledge 文件
app.get('/api/knowledge', async (req, res) => {
  const { courseIds } = req.query;
  try {
    const whereClause = courseIds ? { courseid: courseIds.split(',') } : {};
    const knowledge = await Knowledge.findAll({
      where: whereClause,
      include: [
        {
          model: Teacher,
          attributes: ['username'],
          required: false
        },
        {
          model: Student,
          attributes: ['username'],
          required: false
        }
      ]
    });
    const parsedKnowledge = knowledge.map(file => {
      return {
        ...file.toJSON(),
        relations: file.relations ? JSON.parse(file.relations) : []
      };
    });
    res.status(200).json(parsedKnowledge);
  } catch (err) {
    console.error('Error fetching knowledge:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 更新 knowledge 的 relations 字段
app.put('/api/knowledge/:knowledgeid/relations', async (req, res) => {
  const { knowledgeid } = req.params;
  const { relations } = req.body;
  try {
    const [updated] = await Knowledge.update({ relations: relations }, {
      where: { knowledgeid: knowledgeid }
    });
    if (updated) {
      const updatedKnowledge = await Knowledge.findOne({ where: { knowledgeid: knowledgeid } });
      const parsedKnowledge = {
        ...updatedKnowledge.toJSON(),
        relations: updatedKnowledge.relations ? JSON.parse(updatedKnowledge.relations) : []
      };
      res.status(200).json(parsedKnowledge);
    } else {
      res.status(404).send('Knowledge not found');
    }
  } catch (err) {
    console.error('Error updating knowledge relations:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 删除 knowledge
app.delete('/api/knowledge/:knowledgeid', async (req, res) => {
  const { knowledgeid } = req.params;
  const { filePath } = req.body;
  try {
    const deleted = await Knowledge.destroy({
      where: { knowledgeid: knowledgeid }
    });
    if (deleted) {
      const fullPath = path.join(__dirname, filePath);
      fs.unlink(fullPath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
          return res.status(400).json({ message: 'Internal server error' });
        }
        res.status(200).send();
      });
    } else {
      res.status(404).send('Knowledge not found');
    }
  } catch (err) {
    console.error('Error deleting knowledge:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 增加 reply
app.post('/api/replies', async (req, res) => {
  try {
    const reply = await Reply.create(req.body);

    // 查找问题的发布者
    const question = await Question.findOne({ where: { questionid: reply.questionid } });
    if (question) {
      // 插入通知记录
      await Notification.create({
        senderid: reply.senderid,
        senderRole: reply.role,
        questionid: question.questionid,
        message: 'Your question has a new reply.'
      });
    }

    res.status(200).json(reply);
  } catch (err) {
    console.error('Error creating reply:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 获取用户的通知
app.get('/api/notifications', async (req, res) => {
  const { receiverid, role, isRead } = req.query;
  try {
    const whereClause = {};
    if (receiverid) {
      whereClause.receiverid = receiverid;
    }
    if (role) {
      whereClause.role = role;
    }
    if (isRead) {
      whereClause.isRead = isRead;
    }
    const notifications = await Notification.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 发送通知
app.post('/api/notifications', async (req, res) => {
  const { receiverid, role, questionid, message } = req.body;
  try {
    const notification = await Notification.create({
      receiverid: receiverid,
      role: role,
      questionid: questionid,
      message: message,
      isRead: false
    });
    res.status(200).json({ message: 'Notification sent successfully', notification });
  } catch (err) {
    console.error('Error sending notification:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 标记多个通知已读
app.put('/api/notifications/read', async (req, res) => {
  const { notificationIds } = req.query;
  try {
    const whereClause = notificationIds ? { notificationid: notificationIds.split(',') } : {};
    const [updated] = await Notification.update({ isRead: true }, {
      where: whereClause
    });
    if (updated) {
      res.status(200).json({ message: 'Notifications marked as read' });
    } else {
      res.status(404).send('Notifications not found');
    }
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 删除多个通知
app.delete('/api/notifications', async (req, res) => {
  const { notificationIds } = req.query;
  const transaction = await sequelize.transaction();
  try {
    const whereClause = notificationIds ? { notificationid: notificationIds.split(',') } : {};
    const deleted = await Notification.destroy({
      where: whereClause,
      transaction
    });
    if (deleted) {
      await transaction.commit();
      res.status(200).json({ message: 'Notifications deleted successfully' });
    } else {
      await transaction.rollback();
      res.status(404).json({ message: 'Notifications not found' });
    }
  } catch (err) {
    await transaction.rollback();
    console.error('Error deleting notifications:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 收藏问题
app.post('/api/favorites', async (req, res) => {
  const { studentid, questionid } = req.body;
  try {
    const existingFavorite = await Favorite.findOne({
      where: { studentid, questionid }
    });
    if (existingFavorite) {
      return res.status(400).json({ message: 'Question already favorited' });
    }
    const favorite = await Favorite.create({ studentid, questionid });
    res.status(200).json(favorite);
  } catch (err) {
    console.error('Error adding favorite:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 删除收藏
app.delete('/api/favorites/:favoriteid', async (req, res) => {
  const { favoriteid } = req.params;
  try {
    const deleted = await Favorite.destroy({
      where: { favoriteid, favoriteid }
    });
    if (deleted) {
      res.status(200).json({ message: 'Favorite removed successfully' });
    } else {
      res.status(404).json({ message: 'Favorite not found' });
    }
  } catch (err) {
    console.error('Error removing favorite:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 获取收藏列表
app.get('/api/favorites', async (req, res) => {
  const { studentid, questionid } = req.query;
  try {
    const whereClause = {};
    if (studentid) {
      whereClause.studentid = studentid;
    }
    if (questionid) {
      whereClause.questionid = questionid;
    }
    const favorites = await Favorite.findAll({
      where: whereClause,
      include: [{
        model: Question,
        attributes: ['questionid', 'title', 'content', 'tags', 'images'],
        include: [{
          model: Student,
          attributes: ['username', 'nickname', 'avatar']
        }, {
          model: Course,
          attributes: ['courseid', 'coursename'],
        }]
      }]
    });
    const parsedFavorites = favorites.map(favorite => {
      const question = favorite.Question;
      question.tags = question.tags ? JSON.parse(question.tags) : [];
      question.images = question.images ? JSON.parse(question.images) : [];
      return {
        ...favorite.toJSON(),
        Question: question
      };
    });
    res.status(200).json(parsedFavorites);
  } catch (err) {
    console.error('Error fetching favorites:', err);
    res.status(400).json({ message: 'Internal server error' });
  }
});

// 登录接口
app.post('/api/users/login', async (req, res) => {
  const { userid, password } = req.body;
  const student = await Student.findOne({ where: { userid: userid, password: password } });
  const teacher = await Teacher.findOne({ where: { userid: userid, password: password } });
  if (student) {
    const token = jwt.sign({ userid: student.userid, role: 'student' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ message: 'Login successful', user: student, token, role: 'student' });
  } else if (teacher) {
    const token = jwt.sign({ userid: teacher.userid, role: 'teacher' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ message: 'Login successful', user: teacher, token, role: 'teacher' });
  } else {
    res.status(400).json({ message: 'Invalid username or password' });
  }
});

// 注册接口
app.post('/api/users/register', async (req, res) => {
  const { userid, username, password, role } = req.body;
  try {
    let user;
    if (role === 'student') {
      user = await Student.create({ userid, username, password });
    } else if (role === 'teacher') {
      user = await Teacher.create({ userid, username, password });
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }
    res.status(200).json({ message: 'Registration successful', user });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 定时任务：每小时检查一次
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const questions = await Question.findAll({
      where: {
        status: 'pending',
        pendingTime: {
          [Sequelize.Op.lte]: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }
      }
    });
    for (const question of questions) {
      await Question.update({ status: 'locked' }, {
        where: { questionid: question.questionid }
      });
    }
  } catch (err) {
    console.error('Error updating pending questions to locked status:', err);
  }
});

// 启动服务器
const PORT = process.env.SQL_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});