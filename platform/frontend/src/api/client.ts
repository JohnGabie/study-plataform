import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('user')
  if (token) config.headers['X-User-Id'] = JSON.parse(token).id
  return config
})

export default api
