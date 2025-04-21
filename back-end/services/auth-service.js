import api from "./api"

export const AuthService = {
  async register(userData) {
    try {
      const response = await api.post("/auth/register", userData)
      if (response.data.token) {
        localStorage.setItem("token", response.data.token)
        localStorage.setItem("user", JSON.stringify(response.data.user))
      }
      return response.data
    } catch (error) {
      throw error.response?.data || error
    }
  },

  async login(credentials) {
    try {
      const response = await api.post("/auth/login", credentials)
      if (response.data.token) {
        localStorage.setItem("token", response.data.token)
        localStorage.setItem("user", JSON.stringify(response.data.user))
      }
      return response.data
    } catch (error) {
      throw error.response?.data || error
    }
  },

  async getCurrentUser() {
    try {
      const response = await api.get("/auth/me")
      return response.data
    } catch (error) {
      throw error.response?.data || error
    }
  },

  async updateProfile(profileData) {
    try {
      const response = await api.put("/auth/me", profileData)
      // Update stored user data if it exists
      if (localStorage.getItem("user")) {
        localStorage.setItem("user", JSON.stringify(response.data.user))
      }
      return response.data
    } catch (error) {
      throw error.response?.data || error
    }
  },

  logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    window.location.href = "/login"
  },

  isAuthenticated() {
    return !!localStorage.getItem("token")
  },

  getUser() {
    const userStr = localStorage.getItem("user")
    return userStr ? JSON.parse(userStr) : null
  },

  getRole() {
    const user = this.getUser()
    return user ? user.role : null
  },
}

export default AuthService