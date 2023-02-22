const User = require('../models/User')
const Note = require('../models/Note')

// @desc Get all notes
// @route GET /notes
// @access Private
const getAllNotes = async (req, res) => {
  // Get all notes from MongoDB
  const notes = await Note.find().lean()

  // If no notes
  if (!notes?.length) {
    return res.status(400).json({ message: 'No notes found' })
  }

  // Add username to each note before sending the response
  // See Promise.all with map() here: https://youtu.be/4lqJBBEpjRE
  // You could also do this with a for...of loop
  const notesWithUser = await Promise.all(
    notes.map(async (note) => {
      const user = await User.findById(note.user).lean().exec()
      return { ...note, username: user.username }
    })
  )

  res.json(notesWithUser)
}

// @desc Create new note
// @route POST /notes
// @access Private
const createNewNote = async (req, res) => {
  const { user, title, text } = req.body
  //Confirm data
  if (!user || !title || !text) {
    return res.status(400).json({ message: 'All fields are required' })
  }
  // check for duplicate - use lean because we are not going to use other methods like save on 'duplicate' - need to use exec() if using async await in mongoose and passing in value and need promise
  const duplicate = await Note.findOne({ title }).collation({ locale: 'en', strength: 2 }).lean().exec()
  if (duplicate) {
    return res.status(409).json({ message: 'Duplicate note title' }) // 409 is conflict
  }

  // Create and store new user
  const note = await Note.create({ user, title, text })
  if (note) {
    res.status(201).json({ message: `New note created` })
  } else {
    res.status(400).json({ message: 'Invalid note data received' })
  }
}

// @desc Create new note
// @route PATCH /notes
// @access Private
const updateNote = async (req, res) => {
  const { id, user, title, text, completed } = req.body

  console.log(id, user, title, text, completed)
  //Confirm data
  if (!user || !title || !text || typeof completed !== 'boolean') {
    return res.status(400).json({ message: 'All fields are required' })
  }

  //Confirm note exists
  const note = await Note.findById(id).exec()

  if (!note) {
    res.status(400).json({ message: 'Note not found' })
  }

  // Check for duplicate title
  const duplicate = await Note.findOne({ title }).collation({ locale: 'en', strength: 2 }).lean().exec()

  // Allow renaming of the original note
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: 'Duplicate note title' })
  }

  note.user = user
  note.title = title
  note.text = text
  note.completed = completed

  const updatedNote = await note.save()

  res.json(` ${updatedNote.title} updated`)
}

// @desc Delete note
// @route DELETE /notes
// @access Private
const deleteNote = async (req, res) => {
  const { id } = req.body

  if (!id) {
    return res.status(400).json({ message: 'Note id is required' })
  }

  // Confirm note exists
  const note = await Note.findById(id).exec()

  if (!note) {
    return res.status(400).json({ message: 'Note does not exist' })
  }

  result = await note.deleteOne()

  const reply = `Note '${result.title}' with ID ${result._id} deleted`

  res.json(reply)
}

module.exports = { createNewNote, getAllNotes, updateNote, deleteNote }
