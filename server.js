const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const moment = require('moment')

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true})
.then(()=> console.log("Connected to mongodb"))
.catch(err => console.error(err))

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use(bodyParser.urlencoded({extended: false}))

const ExerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: Date
})

const UserSchema = new Schema({
  username: String,
  log:[ExerciseSchema]
})

const User = mongoose.model('User', UserSchema);


app.post("/api/users", async (req, res)=>{
  let newUser = await new User({
    username: req.body.username
  })
  let savedUser = await newUser.save();
  res.json(savedUser)
})

app.get("/api/users", async (req, res)=>{
  let allUsers = await User.find({});

  res.json(allUsers);
})

app.post("/api/users/:_id/exercises", async (req, res)=>{
  //find the user and update with exercise
  let updatedWithExercise = await User.findByIdAndUpdate(
    req.params._id,
    {
      $push: {
        log: {
          description: req.body.description,
          duration: req.body.duration,
          date: req.body.date ? req.body.date : new Date()
        }
      }
    },
    { new: true, useFindAndModify: false }
  )
  let lastExercise = updatedWithExercise.log[updatedWithExercise.log.length-1]
  let responseObj = {
    username: updatedWithExercise.username,
    description: lastExercise.description,
    duration: parseInt(lastExercise.duration),
    _id: updatedWithExercise._id,
    date: moment(lastExercise.date).format("ddd MMM DD YYYY")
  }
  res.json(responseObj)
})



app.get("/api/users/:_id/logs", async (req, res)=>{

  let userLog = await User.findOne({
    _id: req.params._id
  })
  let log = {
    _id: userLog._id,
    username: userLog.username,
    log: userLog.log.filter((item, index)=>{
      if(req.query.from){
        if(moment(req.query.from).format("X")>moment(item.date).format("X")){
          return false
        }
      }
      if(req.query.to){
        if(moment(req.query.to).format("X")<moment(item.date).format("X")){
          return false
        }
      }
      if(req.query.limit <= index){
        return false
      }
      return true;
    }).map((item)=>{
    return {
      description: item.description,
      duration: item.duration,
      date: moment(item.date).format("ddd MMM DD YYYY")
    }
    }),
    count: userLog.log.length
  }
  res.json(log);
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})