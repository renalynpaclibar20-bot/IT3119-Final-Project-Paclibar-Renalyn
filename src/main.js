import './style.css'
import { supabase } from './supabaseClient'

const $ = (id) => document.getElementById(id)

let currentUser = null

let students = []
let courses = []
let departments = []

let editingStudentId = null
let editingCourseId = null
let editingDepartmentId = null

const app = $('app')

// Escape database values before displaying them in HTML
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character])
}

// Display messages
function showMessage(message, isError = false) {
  const element = $('message')

  if (!element) return

  element.textContent = message
  element.style.color = isError ? 'red' : 'green'
}

// LOGIN
function renderLogin() {
  app.innerHTML = `
    <div id="login-section">
      <h1>Student Records System</h1>

      <p>Please sign in to continue.</p>

      <form id="login-form">
        <input
          id="login-email"
          type="email"
          placeholder="Email address"
          required
        >

        <input
          id="login-password"
          type="password"
          placeholder="Password"
          required
        >

        <button type="submit">Sign in</button>
      </form>

      <p id="login-message"></p>
    </div>
  `

  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault()

    const email = $('login-email').value.trim()
    const password = $('login-password').value

    const message = $('login-message')

    message.textContent = 'Signing in...'
    message.style.color = '#222'

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      message.textContent = error.message
      message.style.color = 'red'
    }
  })
}

// MAIN APPLICATION
function renderApp() {
  app.innerHTML = `
    <div class="container">

      <h1>Student Records System</h1>

      <p>
        Signed in as
        <strong>${escapeHTML(currentUser.email)}</strong>

        <button id="signout-button" class="secondary">
          Sign out
        </button>
      </p>

      <div id="message"></div>

      <!-- STUDENT FORM -->

      <div class="section">
        <h2>Add or Edit a Student</h2>

        <form id="student-form">

          <div class="form-row">
            <input
              id="student-no"
              type="text"
              placeholder="Student number"
              required
            >

            <input
              id="first-name"
              type="text"
              placeholder="First name"
            >

            <input
              id="last-name"
              type="text"
              placeholder="Last name"
            >
          </div>

          <div class="form-row">
            <input
              id="year-level"
              type="number"
              min="1"
              placeholder="Year level"
            >

            <input
              id="student-email"
              type="email"
              placeholder="Student email"
            >

            <select id="student-course">
              <option value="">Choose a course</option>
            </select>
          </div>

          <button type="submit" id="student-save-button">
            Save student
          </button>

          <button
            type="button"
            id="student-clear-button"
            class="secondary"
          >
            Clear form
          </button>

        </form>
      </div>

      <!-- STUDENT LIST -->

      <div class="section">
        <h2>Student List</h2>

        <input
          id="student-search"
          type="text"
          placeholder="Search name or student number"
        >

        <button id="refresh-button" class="secondary">
          Refresh list
        </button>

        <p id="student-count">0 student record(s) loaded.</p>

        <ul id="student-list" class="record-list"></ul>
      </div>

      <!-- COURSE MANAGEMENT -->

      <div class="section">
        <h2>Course Management</h2>

        <form id="course-form">

          <div class="form-row">
            <input
              id="course-code"
              type="text"
              placeholder="Course code"
              required
            >

            <input
              id="course-name"
              type="text"
              placeholder="Course name"
              required
            >

            <select id="course-department">
              <option value="">Choose a department</option>
            </select>
          </div>

          <button type="submit" id="course-save-button">
            Save course
          </button>

          <button
            type="button"
            id="course-clear-button"
            class="secondary"
          >
            Clear form
          </button>

        </form>

        <ul id="course-list" class="record-list"></ul>
      </div>

      <!-- DEPARTMENT MANAGEMENT -->

      <div class="section">
        <h2>Department Management</h2>

        <form id="department-form">

          <input
            id="department-name"
            type="text"
            placeholder="Department name"
            required
          >

          <button type="submit" id="department-save-button">
            Save department
          </button>

          <button
            type="button"
            id="department-clear-button"
            class="secondary"
          >
            Clear form
          </button>

        </form>

        <ul id="department-list" class="record-list"></ul>
      </div>

    </div>
  `

  $('signout-button').addEventListener('click', signOut)

  $('student-form').addEventListener('submit', saveStudent)
  $('student-clear-button').addEventListener('click', clearStudentForm)
  $('student-search').addEventListener('input', renderStudents)
  $('refresh-button').addEventListener('click', loadData)

  $('course-form').addEventListener('submit', saveCourse)
  $('course-clear-button').addEventListener('click', clearCourseForm)

  $('department-form').addEventListener('submit', saveDepartment)
  $('department-clear-button').addEventListener('click', clearDepartmentForm)

  loadData()
}

// SIGN OUT
async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    showMessage(error.message, true)
  }
}

// LOAD DATABASE RECORDS
async function loadData() {
  showMessage('Loading records...')

  const [
    studentsResult,
    coursesResult,
    departmentsResult
  ] = await Promise.all([

    supabase
      .from('students')
      .select('*')
      .order('id', { ascending: true }),

    supabase
      .from('course')
      .select('*')
      .order('course_id', { ascending: true }),

    supabase
      .from('department')
      .select('*')
      .order('department_id', { ascending: true })

  ])

  if (studentsResult.error) {
    showMessage(studentsResult.error.message, true)
    return
  }

  if (coursesResult.error) {
    showMessage(coursesResult.error.message, true)
    return
  }

  if (departmentsResult.error) {
    showMessage(departmentsResult.error.message, true)
    return
  }

  students = studentsResult.data || []
  courses = coursesResult.data || []
  departments = departmentsResult.data || []

  renderCourseOptions()
  renderDepartmentOptions()

  renderStudents()
  renderCourses()
  renderDepartments()

  showMessage('Records loaded successfully.')
}

// STUDENT COURSE DROPDOWN
function renderCourseOptions() {
  const select = $('student-course')

  const currentValue = select.value

  select.innerHTML = `
    <option value="">Choose a course</option>

    ${courses.map(course => `
      <option value="${course.course_id}">
        ${escapeHTML(course.course_code)}
        -
        ${escapeHTML(course.course_name)}
      </option>
    `).join('')}
  `

  if (courses.some(course =>
    String(course.course_id) === currentValue
  )) {
    select.value = currentValue
  }
}

// COURSE DEPARTMENT DROPDOWN
function renderDepartmentOptions() {
  const select = $('course-department')

  const currentValue = select.value

  select.innerHTML = `
    <option value="">Choose a department</option>

    ${departments.map(department => `
      <option value="${department.department_id}">
        ${escapeHTML(department.department_name)}
      </option>
    `).join('')}
  `

  if (departments.some(department =>
    String(department.department_id) === currentValue
  )) {
    select.value = currentValue
  }
}

// DISPLAY STUDENTS
function renderStudents() {
  const search = $('student-search').value.trim().toLowerCase()

  const filteredStudents = students.filter(student => {

    const fullName = `
      ${student.first_name || ''}
      ${student.last_name || ''}
    `.toLowerCase()

    return (
      String(student.student_no || '').toLowerCase().includes(search) ||
      fullName.includes(search) ||
      String(student.email || '').toLowerCase().includes(search)
    )
  })

  $('student-count').textContent =
    `${filteredStudents.length} student record(s) loaded.`

  if (filteredStudents.length === 0) {
    $('student-list').innerHTML =
      '<li>No matching student records.</li>'

    return
  }

  $('student-list').innerHTML = filteredStudents.map(student => {

    const course = courses.find(item =>
      Number(item.course_id) === Number(student.course_id)
    )

    const courseName = course
      ? `${course.course_code} - ${course.course_name}`
      : student.course || 'No course assigned'

    return `
      <li>

        <strong>${escapeHTML(student.student_no)}</strong>
        -
        ${escapeHTML(student.first_name)}
        ${escapeHTML(student.last_name)}

        <br>

        Year level:
        ${escapeHTML(student.year_level || 'Not specified')}

        <br>

        Email:
        ${escapeHTML(student.email || 'Not specified')}

        <br>

        Course:
        ${escapeHTML(courseName)}

        <br>

        <button
          class="edit"
          data-action="edit-student"
          data-id="${student.id}"
        >
          Edit
        </button>

        <button
          class="danger"
          data-action="delete-student"
          data-id="${student.id}"
        >
          Delete
        </button>

      </li>
    `
  }).join('')

  $('student-list')
    .querySelectorAll('[data-action="edit-student"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        editStudent(button.dataset.id)
      })
    })

  $('student-list')
    .querySelectorAll('[data-action="delete-student"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        deleteStudent(button.dataset.id)
      })
    })
}

// SAVE OR UPDATE STUDENT
async function saveStudent(event) {
  event.preventDefault()

  const studentNo = $('student-no').value.trim()

  if (!studentNo) {
    showMessage('Student number is required.', true)
    return
  }

  const courseId = $('student-course').value || null

  const selectedCourse = courses.find(course =>
    String(course.course_id) === courseId
  )

  const studentData = {
    student_no: studentNo,
    first_name: $('first-name').value.trim() || null,
    last_name: $('last-name').value.trim() || null,

    year_level: $('year-level').value
      ? Number($('year-level').value)
      : null,

    email: $('student-email').value.trim() || null,

    course_id: courseId
      ? Number(courseId)
      : null,

    course: selectedCourse
      ? selectedCourse.course_name
      : null
  }

  let result

  if (editingStudentId) {

    result = await supabase
      .from('students')
      .update(studentData)
      .eq('id', editingStudentId)

  } else {

    result = await supabase
      .from('students')
      .insert([studentData])

  }

  if (result.error) {
    showMessage(result.error.message, true)
    return
  }

  clearStudentForm()

  await loadData()

  showMessage('Student saved successfully.')
}

// EDIT STUDENT
function editStudent(id) {
  const student = students.find(item =>
    String(item.id) === String(id)
  )

  if (!student) return

  editingStudentId = student.id

  $('student-no').value = student.student_no || ''
  $('first-name').value = student.first_name || ''
  $('last-name').value = student.last_name || ''
  $('year-level').value = student.year_level ?? ''
  $('student-email').value = student.email || ''
  $('student-course').value = student.course_id ?? ''

  $('student-save-button').textContent = 'Update student'

  showMessage('Editing student record.')

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// DELETE STUDENT
async function deleteStudent(id) {
  const student = students.find(item =>
    String(item.id) === String(id)
  )

  if (!student) return

  if (!confirm(`Delete student ${student.student_no}?`)) {
    return
  }

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)

  if (error) {
    showMessage(error.message, true)
    return
  }

  await loadData()

  showMessage('Student deleted successfully.')
}

// CLEAR STUDENT FORM
function clearStudentForm() {
  $('student-form').reset()

  editingStudentId = null

  $('student-save-button').textContent = 'Save student'
}

// DISPLAY COURSES
function renderCourses() {
  if (courses.length === 0) {
    $('course-list').innerHTML = '<li>No courses found.</li>'
    return
  }

  $('course-list').innerHTML = courses.map(course => {

    const department = departments.find(item =>
      Number(item.department_id) === Number(course.department_id)
    )

    return `
      <li>

        <strong>${escapeHTML(course.course_code)}</strong>
        -
        ${escapeHTML(course.course_name)}

        <br>

        Department:
        ${escapeHTML(department?.department_name || 'Not assigned')}

        <br>

        <button
          class="edit"
          data-action="edit-course"
          data-id="${course.course_id}"
        >
          Edit
        </button>

        <button
          class="danger"
          data-action="delete-course"
          data-id="${course.course_id}"
        >
          Delete
        </button>

      </li>
    `
  }).join('')

  $('course-list')
    .querySelectorAll('[data-action="edit-course"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        editCourse(button.dataset.id)
      })
    })

  $('course-list')
    .querySelectorAll('[data-action="delete-course"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        deleteCourse(button.dataset.id)
      })
    })
}

// SAVE OR UPDATE COURSE
async function saveCourse(event) {
  event.preventDefault()

  const courseData = {
    course_code: $('course-code').value.trim(),

    course_name: $('course-name').value.trim(),

    department_id: $('course-department').value
      ? Number($('course-department').value)
      : null
  }

  if (!courseData.course_code || !courseData.course_name) {
    showMessage('Course code and course name are required.', true)
    return
  }

  let result

  if (editingCourseId) {

    result = await supabase
      .from('course')
      .update(courseData)
      .eq('course_id', editingCourseId)

  } else {

    result = await supabase
      .from('course')
      .insert([courseData])

  }

  if (result.error) {
    showMessage(result.error.message, true)
    return
  }

  clearCourseForm()

  await loadData()

  showMessage('Course saved successfully.')
}

// EDIT COURSE
function editCourse(id) {
  const course = courses.find(item =>
    String(item.course_id) === String(id)
  )

  if (!course) return

  editingCourseId = course.course_id

  $('course-code').value = course.course_code || ''
  $('course-name').value = course.course_name || ''
  $('course-department').value = course.department_id ?? ''

  $('course-save-button').textContent = 'Update course'

  showMessage('Editing course.')

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// DELETE COURSE
async function deleteCourse(id) {
  const course = courses.find(item =>
    String(item.course_id) === String(id)
  )

  if (!course) return

  if (!confirm(`Delete course ${course.course_name}?`)) {
    return
  }

  const { error } = await supabase
    .from('course')
    .delete()
    .eq('course_id', id)

  if (error) {
    showMessage(
      'Unable to delete this course. Existing students may still reference it. ' +
      error.message,
      true
    )

    return
  }

  await loadData()

  showMessage('Course deleted successfully.')
}

// CLEAR COURSE FORM
function clearCourseForm() {
  $('course-form').reset()

  editingCourseId = null

  $('course-save-button').textContent = 'Save course'
}

// DISPLAY DEPARTMENTS
function renderDepartments() {
  if (departments.length === 0) {
    $('department-list').innerHTML =
      '<li>No departments found.</li>'

    return
  }

  $('department-list').innerHTML = departments.map(department => `
    <li>

      <strong>
        ${escapeHTML(department.department_name)}
      </strong>

      <br>

      <button
        class="edit"
        data-action="edit-department"
        data-id="${department.department_id}"
      >
        Edit
      </button>

      <button
        class="danger"
        data-action="delete-department"
        data-id="${department.department_id}"
      >
        Delete
      </button>

    </li>
  `).join('')

  $('department-list')
    .querySelectorAll('[data-action="edit-department"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        editDepartment(button.dataset.id)
      })
    })

  $('department-list')
    .querySelectorAll('[data-action="delete-department"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        deleteDepartment(button.dataset.id)
      })
    })
}

// SAVE OR UPDATE DEPARTMENT
async function saveDepartment(event) {
  event.preventDefault()

  const departmentName = $('department-name').value.trim()

  if (!departmentName) {
    showMessage('Department name is required.', true)
    return
  }

  const departmentData = {
    department_name: departmentName
  }

  let result

  if (editingDepartmentId) {

    result = await supabase
      .from('department')
      .update(departmentData)
      .eq('department_id', editingDepartmentId)

  } else {

    result = await supabase
      .from('department')
      .insert([departmentData])

  }

  if (result.error) {
    showMessage(result.error.message, true)
    return
  }

  clearDepartmentForm()

  await loadData()

  showMessage('Department saved successfully.')
}

// EDIT DEPARTMENT
function editDepartment(id) {
  const department = departments.find(item =>
    String(item.department_id) === String(id)
  )

  if (!department) return

  editingDepartmentId = department.department_id

  $('department-name').value = department.department_name || ''

  $('department-save-button').textContent = 'Update department'

  showMessage('Editing department.')

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// DELETE DEPARTMENT
async function deleteDepartment(id) {
  const department = departments.find(item =>
    String(item.department_id) === String(id)
  )

  if (!department) return

  if (!confirm(`Delete department ${department.department_name}?`)) {
    return
  }

  const { error } = await supabase
    .from('department')
    .delete()
    .eq('department_id', id)

  if (error) {
    showMessage(
      'Unable to delete this department. Existing courses may still reference it. ' +
      error.message,
      true
    )

    return
  }

  await loadData()

  showMessage('Department deleted successfully.')
}

// CLEAR DEPARTMENT FORM
function clearDepartmentForm() {
  $('department-form').reset()

  editingDepartmentId = null

  $('department-save-button').textContent = 'Save department'
}

// INITIAL SESSION CHECK
async function initializeApp() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    renderLogin()
    return
  }

  currentUser = data.session?.user || null

  if (currentUser) {
    renderApp()
  } else {
    renderLogin()
  }
}

// AUTH STATE LISTENER
supabase.auth.onAuthStateChange((event, session) => {

  if (event === 'SIGNED_IN' && session?.user) {
    currentUser = session.user
    renderApp()
  }

  if (event === 'SIGNED_OUT') {
    currentUser = null

    students = []
    courses = []
    departments = []

    editingStudentId = null
    editingCourseId = null
    editingDepartmentId = null

    renderLogin()
  }

})

initializeApp()