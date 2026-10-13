import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
// import {
//   Entity,
//   Column,
//   // PrimaryGeneratedColumn,
//   PrimaryColumn,
//   // BeforeInsert,
//   // CreateDateColumn,
// } from 'typeorm';

export type MkistatDocument = mkistat & Document;

// @Entity()
@Schema({ collection: 'mkistat_mds', timestamps: true })
export class mkistat {
  // @PrimaryColumn()
  @Prop({ type: String })
  MKISTAT_INSTRUMENT_CODE: string;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_INSTRUMENT_NUMBER: number;

  // @Column()
  @Prop({ type: String })
  MKISTAT_QUOTE_BASES: string;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_OPEN_PRICE: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_PUB_LAST_TRADED_PRICE: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_SPOT_LAST_TRADED_PRICE: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_HIGH_PRICE: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_LOW_PRICE: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_CLOSE_PRICE: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_YDAY_CLOSE_PRICE: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_TOTAL_TRADES: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_TOTAL_VOLUME: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_TOTAL_VALUE: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_PUBLIC_TOTAL_TRADES: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_PUBLIC_TOTAL_VOLUME: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_PUBLIC_TOTAL_VALUE: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_SPOT_TOTAL_TRADES: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_SPOT_TOTAL_VOLUME: number;

  // @Column()
  @Prop({ type: Number })
  MKISTAT_SPOT_TOTAL_VALUE: number;

  // @PrimaryColumn()
  @Prop({ type: Date })
  MKISTAT_LM_DATE_TIME: Date;
}

export const MkistatSchema = SchemaFactory.createForClass(mkistat);

MkistatSchema.index(
  { MKISTAT_LM_DATE_TIME: 1, MKISTAT_INSTRUMENT_CODE: 1 },
  { unique: true },
); //Making compund Unique Key...!!!

// export default mongoose.models.mkistat_md ||
//   mongoose.model('mkistat_md', mkistatSchema);
// // export default db.model('STATS', statsSchema);
