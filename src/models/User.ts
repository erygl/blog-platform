import { Schema, model } from "mongoose"

interface IUser {
  username: string,
  email: string,
  name: string,
  password: string,
  avatar: string | null,
  bio: string,
  role: "user" | "admin",
  isVerified: boolean,
  followersCount: number,
  followingCount: number,
  refreshToken: string | null,
  passwordResetToken: string | null,
  passwordResetTokenExpiry: Date | null
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    unique: true,
    trim: true,
    minLength: [3, "Must be at least 3 characters"],
    maxLength: [30, "Must be less than 30 characters"],
    required: true
  },
  email: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    required: true
  },
  name: {
    type: String,
    minLength: [2, "Must be at least 2 characters"],
    maxLength: [50, "Must be less than 50 characters"],
    required: true
  },
  password: {
    type: String,
    select: false,
    required: true
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: ""
  },
  role: {
    type: String,
    enum: {
      values: ["user", "admin"],
      message: "Role must be either user or admin"
    },
    default: "user"
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  followersCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },
  refreshToken: {
    type: String,
    select: false,
    default: null
  },
  passwordResetToken: {
    type: String,
    select: false,
    default: null
  },
  passwordResetTokenExpiry: {
    type: Date,
    select: false,
    default: null
  }
}, { timestamps: true, versionKey: false })

const User = model<IUser>("User", userSchema)

export default User