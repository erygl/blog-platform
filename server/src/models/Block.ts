import { Schema, model, Types } from "mongoose"

interface IBlock {
  blocker: Types.ObjectId,
  blocked: Types.ObjectId,
}

const blockSchema = new Schema<IBlock>({
  blocker: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  blocked: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true, versionKey: false })

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true })
blockSchema.index({ blocked: 1 })

const Block = model<IBlock>("Block", blockSchema)

export default Block
