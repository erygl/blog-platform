import { Schema, model, Types } from "mongoose"

interface IFollower {
  follower: Types.ObjectId,
  following: Types.ObjectId,
}

const followSchema = new Schema<IFollower>({
  follower: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  following: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true, versionKey: false })

followSchema.index({ follower: 1, following: 1 }, { unique: true })
followSchema.index({ follower: 1 })
followSchema.index({ following: 1 })

const Follow = model<IFollower>("Follow", followSchema)

export default Follow