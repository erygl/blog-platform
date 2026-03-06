import { Schema, model, Types } from "mongoose"

interface IUser {
  username: string,
  email: string,
  password: string,
  avatar?: string,
  bio: string,
  role: "user" | "admin",
  isVerified: boolean,
  followers: Types.ObjectId[],
  following: Types.ObjectId[],
  refreshToken: string | null
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    unique: true,
    trim: true,
    minLength: 3,
    maxLength: 30,
    required: true
  },
  email: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    required: true
  },
  password: {
    type: String,
    select: false,
    required: true
  },
  avatar: {
    type: String
  },
  bio: {
    type: String,
    default: ""
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: Schema.Types.ObjectId, ref: "User" }],
  refreshToken: {
    type: String,
    select: false,
    default: null
  }
}, { timestamps: true })

const User = model<IUser>("User", userSchema)

export default User