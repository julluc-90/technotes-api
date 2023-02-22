const User = require('../models/User')
const Note = require('../models/Note')
const bcrypt = require('bcrypt')

// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers = async (req, res) => {
  const users = await User.find().select('-password').lean()
  if (!users?.length) {
    return res.status(400).json({ message: 'No users found' })
  }
  res.json(users)
}

// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = async (req, res) => {
  const { username, password, roles } = req.body
  //Confirm data
  if (!username || !password) {
    return res.status(400).json({ message: 'All fields are required' })
  }
  // check for duplicate - use lean because we are not going to use other methods like save on 'duplicate' - need to use exec() if using async await in mongoose and passing in value and need promise
  const duplicate = await User.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec()
  if (duplicate) {
    return res.status(409).json({ message: 'Duplicate username' }) // 409 is conflict
  }
  // Hash password  ( 10 below is the number of salt rounds)
  const hashedPwd = await bcrypt.hash(password, 10)

  const userObject =
    !Array.isArray(roles) || !roles.length
      ? { username, password: hashedPwd }
      : { username, password: hashedPwd, roles }

  // Create and store new user
  const user = await User.create(userObject)
  if (user) {
    res.status(201).json({ message: `New user ${username} created` })
  } else {
    res.status(400).json({ message: 'Invalid user data received' })
  }
}

// @desc Update a user
// @route PATCH /users
// @access Private
const updateUser = async (req, res) => {
  const { id, username, roles, active, password } = req.body
  //Confirm data
  if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean') {
    console.log(id, username)
    return res.status(400).json({ message: 'All fields except password are required' })
  }
  // not calling .lean here because we need mongoose document that has save method attached
  const user = await User.findById(id).exec()
  if (!user) {
    return res.status(400).json({ message: 'User not found' })
  }

  // Check for duplicate
  const duplicate = await User.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec()
  // Allow updates to the original user
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: 'Duplicate username' })
  }
  user.username = username
  user.roles = roles
  user.active = active

  if (password) {
    // hash password
    user.password = await bcrypt.hash(password, 10) // 10 salt rounds
  }

  const updatedUser = await user.save()

  res.json({ message: ` ${updatedUser.username} updated` })
}

// @desc Delete a user
// @route DELETE /users
// @access Private
const deleteUser = async (req, res) => {
  const { id } = req.body
  if (!id) {
    return res.status(400).json({ message: 'User Id required' })
  }
  //check to see if there are notes before deleting user
  const note = await Note.findOne({ user: id }).lean().exec()
  if (note) {
    return res.status(400).json({ message: 'User has assigned notes' })
  }

  const user = await User.findById(id).exec()

  if (!user) {
    return res.status(400).json({ message: 'User not found' })
  }
  const result = await user.deleteOne()

  const reply = `Username ${result.username} with ID ${result._id} deleted`

  res.json(reply)
}

module.exports = { getAllUsers, createNewUser, updateUser, deleteUser }
