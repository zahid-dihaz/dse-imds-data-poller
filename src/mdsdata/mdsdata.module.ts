import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { idx, IdxSchema } from './entities/idx.entities';
import { trd, TrdSchema } from './entities/trd.entities';
import { mkistat, MkistatSchema } from './entities/mkistat.entities';
import { man, ManSchema } from './entities/man.entities';
import { lastData, LastDataSchema } from './entities/last_data';

import { IndexProvider } from './index';

import { MdsdataService } from './services/mdsdata.service';
import { LastDataService } from './services/lastData.service';
import { DailyStatusModule } from '../daily_status/daily-status.module';

@Module({
  imports: [
    DailyStatusModule,
    MongooseModule.forFeature([
      { name: idx.name, schema: IdxSchema },
      { name: trd.name, schema: TrdSchema },
      { name: mkistat.name, schema: MkistatSchema },
      { name: man.name, schema: ManSchema },
      { name: lastData.name, schema: LastDataSchema },
    ]),
  ],
  controllers: [],
  providers: [IndexProvider, MdsdataService, LastDataService],
})
export default class MdsDataModule {}
