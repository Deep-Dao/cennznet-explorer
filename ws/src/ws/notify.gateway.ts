import { Injectable } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { logger } from '../common/logger';
import { DataService } from '../services/data.service';

export interface IMessage {
	blockNumber: number;
}

@Injectable()
@WebSocketGateway({ namespace: 'notify' })
export class NotifyGateway {
	@WebSocketServer()
	private server: Server;

	constructor(private readonly dataService: DataService) {}

	@SubscribeMessage('message')
	public async onEvent(client, data: IMessage): Promise<void> {
		logger.debug('ws: received message', { data });
		await this.broadcastLatestBlock(data);
	}

	public async updateLatestBlock(message: IMessage): Promise<void> {
		logger.debug('http: received message', message);
		await this.broadcastLatestBlock(message);
	}

	private async broadcastLatestBlock(msg: IMessage): Promise<void> {
		const latestBlockHeight = await this.dataService.getBlockHeight();
		const blockNumber = msg.blockNumber;
		logger.debug('blockNumber ' + blockNumber);
		logger.debug('latestBlockHeight ' + latestBlockHeight);

		// TODO blockNumber some haw always less then latestBlockHeight ??
		// TODO OR true is a temporary workaround
		if (blockNumber >= latestBlockHeight || true) {
			const result = await Promise.all([
				this.dataService.getBlock(blockNumber),
				this.dataService.getTxListByBlockNumber(blockNumber, 1, 20, {}),
				// Promise.resolve(txn)
			]);

			const [block, txns] = result;
			this.server.emit('latestBlock', { messages: { block, txns } });
		}
	}
}
