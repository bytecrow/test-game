import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import {
  GameService,
  Result,
  GameId,
  GameState,
  PlayerId,
} from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  createGame(@Body() params: { M: number; N: number }): Result<GameId> {
    return this.gameService.newGame({
      fieldWidth: params.M,
      fieldHeight: params.M,
      diamondsQuantity: params.N,
    });
  }

  @Get(':id')
  getGame(@Param('id') id: GameId): Result<GameState> {
    return this.gameService.getGame(id);
  }

  @Post(':id/turn')
  makeTurn(
    @Param('id') id: GameId,
    @Body() body: { userId: PlayerId; x: number; y: number },
  ): Result<GameState> {
    return this.gameService.makeTurn(id, body.userId, body.x, body.y);
  }
}
