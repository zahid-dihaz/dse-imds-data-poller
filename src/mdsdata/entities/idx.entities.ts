import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
// import {
//   Entity,
//   Column,
//   // PrimaryGeneratedColumn,
//   PrimaryColumn,
//   // BeforeInsert,
//   // CreateDateColumn,
//   Index,
// } from 'typeorm';

export type IdxDocument = idx & Document;

// @Entity()
// @Index(['IDX_INDEX_ID', 'IDX_DATE_TIME'], { unique: true })
@Schema({ collection: 'idx_mds', timestamps: true })
export class idx {
  // @PrimaryColumn()
  @Prop({ type: String })
  IDX_INDEX_ID: string;

  // @PrimaryColumn()
  @Prop({ type: Date })
  IDX_DATE_TIME: Date;

  // @Column()
  @Prop({ type: Number })
  IDX_CAPITAL_VALUE: number;

  // @Column()
  @Prop({ type: Number })
  IDX_DEVIATION: number;

  // @Column()
  @Prop({ type: Number })
  IDX_PERCENTAGE_DEVIATION: number;
  //In mysql database it is written lDX instead of IDX;
}

export const IdxSchema = SchemaFactory.createForClass(idx);
IdxSchema.index({ IDX_INDEX_ID: 1, IDX_DATE_TIME: 1 }, { unique: true });
// export default mongoose.models.idx_md || mongoose.model('idx_md', idxSchema);
// // export default db.model('idx', idxSchema);
