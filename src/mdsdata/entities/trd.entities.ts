import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrdDocument = trd & Document;

// @Entity()
@Schema({ collection: 'trd_mds', timestamps: true })
export class trd {
  // @Column()
  @Prop({ type: Number })
  TRD_SNO: number;

  // @Column()
  @Prop({ type: Number })
  TRD_TOTAL_TRADES: number;

  // @Column()
  @Prop({ type: Number })
  TRD_TOTAL_VOLUME: number;

  // @Column()
  @Prop({ type: Number })
  TRD_TOTAL_VALUE: number;

  @Prop({ type: Date, index: true, unique: true })
  TRD_LM_DATE_TIME: Date;
}

export const TrdSchema = SchemaFactory.createForClass(trd);

// TrdSchema.index({ TRD_SNO: 1, TRD_LM_DATE_TIME: 1 }, { unique: true }); //Making compund Unique Key...!!!

// export default mongoose.models.trd_md || mongoose.model('trd_md', trdSchema);
// // module.exports= mongoose.model('trd', trdSchema);
