import React, { useState, useEffect, useRef } from 'react';
import { Character, LaneConstraint, Stance, Terrain, SingleBattleRecord, RoundResolutionResult } from '../game/types';
import { groupRosterByTier } from '../game/gameService';
import { createStandardDeck } from '../game/registry/characters';
import { LANE_CONSTRAINTS, drawRandomLaneConstraint, getLaneConstraint } from '../game/registry/laneConstraints';
import { addGold } from '../game/economy/wallet';
import { resolveRound } from '../game/engine';
import { networkManager } from '../game/online/networkManager';
import { NetworkMessage } from '../game/online/types';
import { soundManager } from '../game/soundManager';
import { CardView } from './CardView';
import { TerrainBanner } from './TerrainBanner';
import { PixelHeart, PixelPieceIcon } from './PixelIcons';

interface OnlineMatchViewProps {
  roomCode: string;
  isHost: boolean;
  onExit: () => void;
}

export const OnlineMatchView: React.FC<OnlineMatchViewProps> = ({
  roomCode,
  isHost,
  onExit
}) => {
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [myStance, setMyStance] = useState<Stance>('ODD');
  const [opponentStance, setOpponentStance] = useState<Stance | null>(null);
  const myStanceRef = useRef<Stance>('ODD');
  myStanceRef.current = myStance;

  const [myHp, setMyHp] = useState<number>(3);
  const [opponentHp, setOpponentHp] = useState<number>(3);
  const [myAtk, setMyAtk] = useState<number>(1);
  const [opponentAtk, setOpponentAtk] = useState<number>(1);

  const [myHand, setMyHand] = useState<Character[]>([]);
  const [myDeployment, setMyDeployment] = useState<(Character | null)[]>([null, null, null]);
  const [opponentDeployment, setOpponentDeployment] = useState<Character[] | null>(null);

  const [currentTerrains, setCurrentTerrains] = useState<Terrain[]>([]);
  const [currentConstraint, setCurrentConstraint] = useState<LaneConstraint>(LANE_CONSTRAINTS[0]);
  const [roundPool, setRoundPool] = useState<Character[]>([]);

  const [myReady, setMyReady] = useState<boolean>(false);
  const [opponentReady, setOpponentReady] = useState<boolean>(false);

  // 動畫與結算
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [dealStep, setDealStep] = useState<number>(-1);
  const [resolveStep, setResolveStep] = useState<number>(-1);
  const [pendingResult, setPendingResult] = useState<RoundResolutionResult | null>(null);
  const [battleLogs, setBattleLogs] = useState<SingleBattleRecord[]>([]);

  // 連貫動效狀態 (L4 ➔ L1 ➔ L2)
  const [liftingHandIndex, setLiftingHandIndex] = useState<number | null>(null);
  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null);
  const [recallingSlot, setRecallingSlot] = useState<number | null>(null);
  const isDeployingRef2 = useRef(false);
  const deployTimerRef2 = useRef<number | null>(null);
  const dropTimerRef2 = useRef<number | null>(null);
  const recallTimerRef2 = useRef<number | null>(null);

  // 狀態與歷史
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<'me' | 'opponent' | 'draw' | null>(null);
  const [earnedReward, setEarnedReward] = useState<{ amount: number; text: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [inspectedTerrainIndex, setInspectedTerrainIndex] = useState<number | null>(null);
  const [pingMs, setPingMs] = useState<number>(20);
  const [opponentDisconnected, setOpponentDisconnected] = useState<boolean>(false);

  // 再戰確認
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState<boolean>(false);
  const [rematchRequestedByOpponent, setRematchRequestedByOpponent] = useState<boolean>(false);

  // 房主暫存挑戰者出牌
  const guestDeploymentRef = useRef<Character[] | null>(null);
  const hostDeploymentRef = useRef<Character[] | null>(null);
  const guestStanceRef = useRef<Stance>('ODD');
  const roundNumberRef = useRef<number>(1);
  const hostDeckRef = useRef<Character[]>([]);
  const guestDeckRef = useRef<Character[]>([]);
  const hostAtkRef = useRef<number>(1);
  const guestAtkRef = useRef<number>(1);
  const hostHpRef = useRef<number>(3);
  const guestHpRef = useRef<number>(3);
  const roundHistoryRef = useRef<{ round: number; playerTotalScore: number; enemyTotalScore: number }[]>([]);
  const currentConstraintRef = useRef<LaneConstraint>(LANE_CONSTRAINTS[0]);
  currentConstraintRef.current = currentConstraint;

  // 保持 ref 同步
  useEffect(() => {
    roundNumberRef.current = roundNumber;
  }, [roundNumber]);

  /**
   * 房主啟動指定回合 (deal new round)
   */
  const hostStartRound = (
    targetRound: number, currentHostHp: number, currentGuestHp: number,
    currentHostAtk: number = 1, currentGuestAtk: number = 1
  ) => {
    if (targetRound === 1) {
      hostDeckRef.current = createStandardDeck('player');
      guestDeckRef.current = createStandardDeck('enemy');
      roundHistoryRef.current = [];
    }
    const hostHand = hostDeckRef.current.slice(0, 3);
    const guestHand = guestDeckRef.current.slice(0, 3);
    hostDeckRef.current = hostDeckRef.current.slice(3);
    guestDeckRef.current = guestDeckRef.current.slice(3);
    const constraint = drawRandomLaneConstraint();
    const terrains: Terrain[] = [
      { id: 'left_lane', name: '左翼陣線', weight: 1, icon: 'town', color: '#64748b', description: '常規陣線，倍率 ×1。' },
      { id: 'middle_lane', name: `中路核心 · ${constraint.name}`, weight: 2, icon: 'arena', color: constraint.color, description: constraint.description },
      { id: 'right_lane', name: '右翼陣線', weight: 1, icon: 'town', color: '#64748b', description: '常規陣線，倍率 ×1。' }
    ];
    const pool = [...hostHand, ...guestHand].sort((a, b) => (a.base_level ?? a.level ?? 0) - (b.base_level ?? b.level ?? 0));

    setRoundNumber(targetRound);
    setMyStance('ODD');
    setOpponentStance(null);
    setMyHp(currentHostHp);
    setOpponentHp(currentGuestHp);
    setMyAtk(currentHostAtk);
    setOpponentAtk(currentGuestAtk);
    hostAtkRef.current = currentHostAtk;
    guestAtkRef.current = currentGuestAtk;
    hostHpRef.current = currentHostHp;
    guestHpRef.current = currentGuestHp;
    currentConstraintRef.current = constraint;
    setCurrentConstraint(constraint);
    setMyHand(hostHand);
    setMyDeployment([null, null, null]);
    setOpponentDeployment(null);
    setCurrentTerrains(terrains);
    setRoundPool(pool);
    setMyReady(false);
    setOpponentReady(false);
    setIsResolving(false);
    setDealStep(-1);
    setResolveStep(-1);
    setPendingResult(null);
    setBattleLogs([]);
    setEarnedReward(null);

    guestDeploymentRef.current = null;
    hostDeploymentRef.current = null;

    // 發送給挑戰者
    networkManager.send({
      type: 'ROUND_START',
      sender: 'HOST',
      roundNumber: targetRound,
      terrains,
      laneConstraintId: constraint.id,
      guestHand,
      roundPool: pool,
      hostHp: currentHostHp,
      guestHp: currentGuestHp,
      hostAtk: currentHostAtk,
      guestAtk: currentGuestAtk,
      timestamp: Date.now()
    });
  };

  // 初始化連線回調
  useEffect(() => {
    networkManager.init({
      onStatusChange: (status) => {
        if (status === 'disconnected') {
          setOpponentDisconnected(true);
        }
      },
      onPingUpdate: (latency) => {
        setPingMs(latency);
      },
      onError: (err) => {
        console.error('Online match error:', err);
      },
      onMessage: (msg: NetworkMessage) => {
        handleIncomingMessage(msg);
      }
    });

    // 房主啟動第 1 回合
    if (isHost) {
      hostStartRound(1, 3, 3);
    }

    return () => {
      // 離開時通知對手
      networkManager.send({
        type: 'LEAVE',
        sender: isHost ? 'HOST' : 'GUEST',
        timestamp: Date.now()
      });
    };
  }, []);

  /**
   * 處理接收到的網路訊息
   */
  const handleIncomingMessage = (msg: NetworkMessage) => {
    switch (msg.type) {
      case 'ROUND_START': {
        // 挑戰者接收回合開始
        setRoundNumber(msg.roundNumber);
        setMyStance('ODD');
        setOpponentStance(null);
        setMyHp(msg.guestHp);
        setOpponentHp(msg.hostHp);
        setMyAtk(msg.guestAtk);
        setOpponentAtk(msg.hostAtk);
        guestAtkRef.current = msg.guestAtk;
        hostAtkRef.current = msg.hostAtk;
        guestHpRef.current = msg.guestHp;
        hostHpRef.current = msg.hostHp;
        setMyHand(msg.guestHand);
        setMyDeployment([null, null, null]);
        setOpponentDeployment(null);
        setCurrentTerrains(msg.terrains);
        setCurrentConstraint(getLaneConstraint(msg.laneConstraintId));
        setRoundPool([...msg.roundPool].sort((a, b) => (a.base_level ?? a.level ?? 0) - (b.base_level ?? b.level ?? 0)));
        setMyReady(false);
        setOpponentReady(false);
        setIsResolving(false);
        setDealStep(-1);
        setResolveStep(-1);
        setPendingResult(null);
        setBattleLogs([]);
        break;
      }

      case 'DEPLOY_READY': {
        setOpponentReady(msg.isReady);
        soundManager.playSfx('enemyDeal');
        break;
      }

      case 'SUBMIT_DEPLOY': {
        // 房主收到挑戰者的佈署
        guestDeploymentRef.current = msg.deployment;
        guestStanceRef.current = msg.stance;
        setOpponentReady(true);

        // 若房主自己也已經點擊出征，則立即結算！
        if (hostDeploymentRef.current) {
          hostResolveTurn(hostDeploymentRef.current, msg.deployment, msg.stance);
        }
        break;
      }

      case 'ROUND_RESOLVED': {
        // 挑戰者收到房主結算結果
        const enemyCards = msg.hostDeployment;

        setOpponentDeployment(enemyCards);
        setOpponentStance(msg.result.playerStance);
        setPendingResult(msg.result);
        setBattleLogs([]);
        setIsResolving(true);
        setDealStep(0); // 啟動翻牌動畫
        break;
      }

      case 'REMATCH_REQUEST': {
        setRematchRequestedByOpponent(true);
        break;
      }

      case 'REMATCH_START': {
        setGameOver(false);
        setWinner(null);
        setRematchRequestedByMe(false);
        setRematchRequestedByOpponent(false);
        setHistory([]);
        if (isHost) {
          hostStartRound(1, 3, 3);
        }
        break;
      }

      case 'LEAVE': {
        setOpponentDisconnected(true);
        break;
      }
    }
  };

  /**
   * 房主執行核心結算並廣播
   */
  const hostResolveTurn = (hDeploy: Character[], gDeploy: Character[], gStance: Stance) => {
    const roundNum = roundNumberRef.current;
    const result = resolveRound(
      hDeploy, gDeploy, myStanceRef.current, gStance, currentConstraintRef.current,
      roundNum, hostHpRef.current, guestHpRef.current, hostAtkRef.current, guestAtkRef.current, roundHistoryRef.current
    );
    roundHistoryRef.current = [...roundHistoryRef.current, {
      round: roundNum,
      playerTotalScore: result.playerTotalScore,
      enemyTotalScore: result.enemyTotalScore
    }];
    hostHpRef.current = result.playerHpAfter;
    guestHpRef.current = result.enemyHpAfter;
    hostAtkRef.current = result.playerAtkAfter;
    guestAtkRef.current = result.enemyAtkAfter;
    setOpponentStance(gStance);

    setOpponentDeployment(gDeploy);
    setPendingResult(result);
    setBattleLogs([]);
    setIsResolving(true);
    setDealStep(0);

    // 廣播給挑戰者
    networkManager.send({
      type: 'ROUND_RESOLVED',
      sender: 'HOST',
      hostDeployment: hDeploy,
      guestDeployment: gDeploy,
      result,
      timestamp: Date.now()
    });
  };

  /**
   * 點選手牌：佈署進戰場
   */
  const handleCardClick = (card: Character, index: number) => {
    if (isResolving || myReady || isDeployingRef2.current) return;
    const emptySlot = myDeployment.findIndex(s => s === null);
    if (emptySlot !== -1) {
      isDeployingRef2.current = true;
      soundManager.ensureContext();

      setLiftingHandIndex(index);

      deployTimerRef2.current = window.setTimeout(() => {
        const newDeployment = [...myDeployment];
        newDeployment[emptySlot] = card;
        setMyDeployment(newDeployment);

        const newHand = [...myHand];
        newHand.splice(index, 1);
        setMyHand(newHand);

        setLiftingHandIndex(null);
        setAnimatingSlot(emptySlot);

        const count = newDeployment.filter(c => c !== null).length;
        if (count === 3) {
          soundManager.playSfx('deployReady');
        } else {
          soundManager.playSfx('cardDeploy');
        }

        dropTimerRef2.current = window.setTimeout(() => {
          setAnimatingSlot(null);
          isDeployingRef2.current = false;
          dropTimerRef2.current = null;
        }, 200);

        deployTimerRef2.current = null;
      }, 80);
    }
  };

  /**
   * 點選戰場槽位：撤回卡牌 (card-recall-out 0.3s)
   */
  const handleSlotClick = (card: Character | null, index: number) => {
    if (isResolving || card === null || myReady || isDeployingRef2.current) return;
    isDeployingRef2.current = true;
    soundManager.ensureContext();
    soundManager.playSfx('cardRecall');

    setRecallingSlot(index);

    recallTimerRef2.current = window.setTimeout(() => {
      setMyHand(prev => [...prev, card]);
      const newDeployment = [...myDeployment];
      newDeployment[index] = null;
      setMyDeployment(newDeployment);
      setRecallingSlot(null);
      isDeployingRef2.current = false;
      recallTimerRef2.current = null;
    }, 80);
  };

  /**
   * 確認出兵 (出征決鬥！)
   */
  const submitDeployment = () => {
    const deployed = myDeployment.filter(c => c !== null) as Character[];
    if (deployed.length < 3 || isResolving || myReady) return;

    // 提交時清除殘留動畫定時器
    if (deployTimerRef2.current) { window.clearTimeout(deployTimerRef2.current); deployTimerRef2.current = null; }
    if (dropTimerRef2.current) { window.clearTimeout(dropTimerRef2.current); dropTimerRef2.current = null; }
    if (recallTimerRef2.current) { window.clearTimeout(recallTimerRef2.current); recallTimerRef2.current = null; }
    isDeployingRef2.current = false;
    setLiftingHandIndex(null);
    setAnimatingSlot(null);
    setRecallingSlot(null);

    soundManager.ensureContext();
    soundManager.playSfx('startClash');
    setMyReady(true);
    setInspectedTerrainIndex(null);

    // 發送就緒狀態
    networkManager.send({
      type: 'DEPLOY_READY',
      sender: isHost ? 'HOST' : 'GUEST',
      isReady: true,
      timestamp: Date.now()
    });

    if (isHost) {
      hostDeploymentRef.current = deployed;
      // 若挑戰者已先送達出牌，直接結算
      if (guestDeploymentRef.current) {
          hostResolveTurn(deployed, guestDeploymentRef.current, guestStanceRef.current);
      }
    } else {
      // 挑戰者將手牌發送給房主
      networkManager.send({
        type: 'SUBMIT_DEPLOY',
        sender: 'GUEST',
        deployment: deployed,
        stance: myStance,
        timestamp: Date.now()
      });
    }
  };

  // 第一階段動畫：敵方卡片依序飛入戰場
  useEffect(() => {
    if (dealStep >= 0 && dealStep < 3) {
      soundManager.playSfx('enemyDeal');
      const timer = setTimeout(() => {
        setDealStep(prev => prev + 1);
      }, 300);
      return () => clearTimeout(timer);
    } else if (dealStep === 3) {
      const timer = setTimeout(() => {
        setResolveStep(0); // 飛入完畢，進入逐格翻牌
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [dealStep]);

  // 第二階段動畫：逐格翻牌、特效文字與算式展示
  useEffect(() => {
    if (resolveStep >= 0 && resolveStep < 3 && pendingResult && pendingResult.battles) {
      const currentBattle = pendingResult.battles[resolveStep];
      soundManager.playSfx('cardReveal');
      if (currentBattle.traits_triggered && currentBattle.traits_triggered.length > 0) {
        setTimeout(() => {
          soundManager.playSfx('traitTrigger');
        }, 400);
      }
      setBattleLogs(prev => {
        const newLogs = [...prev];
        newLogs[resolveStep] = currentBattle;
        return newLogs;
      });

      const timer = setTimeout(() => {
        setResolveStep(prev => prev + 1);
      }, 3400);

      return () => clearTimeout(timer);
    } else if (resolveStep === 3 && pendingResult) {
      // 3 個戰場結算完畢，扣除血量
      const endTimer = setTimeout(() => {
        const newHostHp = pendingResult.playerHpAfter;
        const newGuestHp = pendingResult.enemyHpAfter;
        const newHostAtk = pendingResult.playerAtkAfter;
        const newGuestAtk = pendingResult.enemyAtkAfter;

        const myNewHp = isHost ? newHostHp : newGuestHp;
        const opNewHp = isHost ? newGuestHp : newHostHp;
        const myNewAtk = isHost ? newHostAtk : newGuestAtk;
        const opNewAtk = isHost ? newGuestAtk : newHostAtk;

        setMyHp(myNewHp);
        setOpponentHp(opNewHp);
        setMyAtk(myNewAtk);
        setOpponentAtk(opNewAtk);
        if (myNewHp < myHp || opNewHp < opponentHp) soundManager.playSfx('hitDamage');

        // 存入戰況歷史
        setHistory(prev => [
          ...prev,
          {
            round: roundNumber,
            battles: pendingResult.battles,
            total_score: pendingResult.total_score,
            damage_to: pendingResult.damage_to,
            host_stance: isHost ? pendingResult.playerStance : pendingResult.enemyStance,
            guest_stance: isHost ? pendingResult.enemyStance : pendingResult.playerStance
          }
        ]);

        const nextRoundTimer = setTimeout(() => {
          if (pendingResult.game_over) {
            setGameOver(true);
            const hostWon = pendingResult.gameWinner === 'player';
            const iWon = pendingResult.gameWinner === 'draw' ? false : isHost ? hostWon : !hostWon;
            setWinner(pendingResult.gameWinner === 'draw' ? 'draw' : iWon ? 'me' : 'opponent');
            if (pendingResult.gameWinner === 'draw') {
              addGold(30, '雲端對戰 平局獎勵');
              setEarnedReward({ amount: 30, text: '雲端對決 平局獎勵' });
            } else if (iWon) {
              soundManager.playSfx('victory');
              addGold(80, '雲端對戰 獲勝獎勵');
              setEarnedReward({ amount: 80, text: '雲端對決 獲勝軍餉' });
              setTimeout(() => soundManager.playSfx('coin'), 700);
            } else {
              soundManager.playSfx('defeat');
              addGold(30, '雲端對戰 奮戰慰問金');
              setEarnedReward({ amount: 30, text: '雲端對決 奮戰慰問金' });
              setTimeout(() => soundManager.playSfx('coin'), 700);
            }
          } else {
            // 若為房主，過渡至下一回合
            if (isHost) {
              hostStartRound(roundNumber + 1, newHostHp, newGuestHp, newHostAtk, newGuestAtk);
            }
          }

          setDealStep(-1);
          setResolveStep(-1);
          setIsResolving(false);
          setPendingResult(null);
          setBattleLogs([]);
        }, 1800);

        return () => clearTimeout(nextRoundTimer);
      }, 600);

      return () => clearTimeout(endTimer);
    }
  }, [resolveStep, pendingResult]);

  /**
   * 請求再戰一局
   */
  const handleRequestRematch = () => {
    soundManager.playSfx('click');
    setRematchRequestedByMe(true);
    networkManager.send({
      type: 'REMATCH_REQUEST',
      sender: isHost ? 'HOST' : 'GUEST',
      timestamp: Date.now()
    });

    if (rematchRequestedByOpponent || isHost) {
      networkManager.send({
        type: 'REMATCH_START',
        sender: isHost ? 'HOST' : 'GUEST',
        timestamp: Date.now()
      });
      setGameOver(false);
      setWinner(null);
      setRematchRequestedByMe(false);
      setRematchRequestedByOpponent(false);
      setHistory([]);
      if (isHost) {
        hostStartRound(1, 3, 3);
      }
    }
  };

  const renderHearts = (hp: number, size: number = 18) => {
    return Array.from({ length: 3 }).map((_, i) => (
      <span key={i} style={{ display: 'inline-flex', marginRight: '3px' }}>
        <PixelHeart filled={i < hp} size={size} />
      </span>
    ));
  };

  const deployedCount = myDeployment.filter(c => c !== null).length;
  const isDeployReady = deployedCount === 3;
  const renderStanceControls = () => (
    <div style={{ display: 'flex', gap: '6px', margin: '8px 0', padding: '6px', border: '1px solid #334155', background: '#090d16' }}>
      {(['ODD', 'EVEN'] as Stance[]).map(stance => (
        <button
          key={stance}
          type="button"
          disabled={isResolving || myReady}
          onClick={() => setMyStance(stance)}
          style={{
            flex: 1, padding: '7px 4px', cursor: isResolving || myReady ? 'not-allowed' : 'pointer',
            background: myStance === stance ? (stance === 'ODD' ? '#854d0e' : '#7f1d1d') : '#18181b',
            color: myStance === stance ? '#fff' : '#94a3b8',
            border: `2px solid ${myStance === stance ? (stance === 'ODD' ? '#eab308' : '#ef4444') : '#27272a'}`,
            fontFamily: 'var(--font-pixel)', fontSize: '10px'
          }}
        >
          {stance === 'ODD' ? '[ ODD · 蓄力 ]' : '[ EVEN · 攻擊 ]'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="game-wrapper">
      {/* 頂部連線狀態列 (雲端專屬) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '36px',
          background: '#020617',
          borderBottom: '2px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 1000,
          fontSize: '12px',
          fontFamily: 'monospace'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>
            [ 房間: {roomCode} ]
          </span>
          <span style={{ color: isHost ? '#ffcc00' : '#38bdf8' }}>
            {isHost ? '● 房主' : '● 挑戰者'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: pingMs < 80 ? '#00ffcc' : '#f59e0b' }}>
            PING: {pingMs}ms
          </span>
          <button
            onClick={() => {
              soundManager.playSfx('click');
              networkManager.cleanup();
              onExit();
            }}
            style={{
              background: '#dc2626',
              border: '1px solid #ff4747',
              color: '#fff',
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
          >
            退出連機
          </button>
        </div>
      </div>

      {/* ============ 我方控制面板 (左側 / 電腦版) ============ */}
      <div className="side-panel player-panel desktop-only" style={{ marginTop: '36px' }}>
        <div className="hud-box player-hud">
          <div style={{ fontWeight: 'bold', color: '#00ffcc', letterSpacing: '1px' }}>
            [ {myStance} 姿態 ] 我方 ({isHost ? '房主' : '挑戰者'})
          </div>
          <div className="hp-bar">{renderHearts(myHp)}</div>
          <div style={{ fontSize: '11px', color: '#fbbf24' }}>ATK: {myAtk}</div>
        </div>

        <div style={{ marginTop: '8px', padding: '8px', border: '1px solid #334155', color: '#cbd5e1', fontSize: '11px' }}>
          <strong style={{ color: currentConstraint.color }}>中路禁令：{currentConstraint.name}</strong>
          <div style={{ marginTop: '4px' }}>{currentConstraint.description}</div>
        </div>
        {renderStanceControls()}

        <div style={{ color: '#94a3b8', fontSize: '12px', margin: '10px 0 5px 0' }}>
          {isDeployReady ? '戰備完畢 · 點擊槽位撤回' : '本回合 3 張全數佈署'}
        </div>

        {/* 本回合三張手牌 */}
        <div
          className="hand-container"
          style={{
            opacity: isResolving || myReady ? 0.6 : 1,
            pointerEvents: isResolving || myReady ? 'none' : 'auto'
          }}
        >
          {myHand.map((card, i) => (
            <div key={card.id + i} onClick={() => handleCardClick(card, i)}>
              <CardView
                character={card}
                color="white"
                isUnselectedHand={isDeployReady}
                isLiftingOff={liftingHandIndex === i}
              />
            </div>
          ))}
          {myHand.length === 0 && (
            <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
              手牌已全數佈署
            </div>
          )}
        </div>

        <button
          className={`btn ${isDeployReady && !myReady && !isResolving ? 'engage' : ''}`}
          onClick={submitDeployment}
          disabled={!isDeployReady || isResolving || myReady}
          style={{ width: '100%', marginTop: '12px' }}
        >
          {isResolving
            ? '決鬥交鋒中...'
            : myReady
              ? '已就緒 · 等待對手...'
              : isDeployReady
                ? '出征決鬥！'
                : `佈署兵力 (${deployedCount}/3)`}
        </button>
      </div>

      {/* ============ 中央 戰鬥舞台 ============ */}
      <div className="main-stage" style={{ marginTop: '36px' }}>
        {/* 對陣名冊 (依等級聚合與同階對位展示) */}
        <div className="deck-info-box desktop-only">
          <span className="deck-info-title">[ ROUND {roundNumber} 名冊 ]</span>
          {groupRosterByTier(roundPool).map(group => {
            if (group.characters.length === 1) {
              const char = group.characters[0];
              return (
                <span key={char.id} className="roster-item single" title={`${char.name} (LV.${char.level})`}>
                  <PixelPieceIcon type={char.avatar.src || char.id} color="white" size={15} />
                  <span className="roster-name">{char.name}</span>
                </span>
              );
            }
            return (
              <div key={`tier_${group.level}`} className="roster-tier-chip conflict" title={`同階棋手對陣 (LV.${group.level})`}>
                <span className="roster-level-tag">LV.{group.level}:</span>
                {group.characters.map((char, idx) => (
                  <span key={char.id} className="roster-pair-entry">
                    {idx > 0 && <span className="roster-slash">/</span>}
                    <PixelPieceIcon type={char.avatar.src || char.id} color="white" size={14} />
                    <span className="roster-name conflict-name">{char.name}</span>
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {/* 對手出兵就緒狀態提示條 */}
        <div
          style={{
            background: opponentReady ? 'rgba(0,255,204,0.15)' : 'rgba(245,158,11,0.15)',
            border: opponentReady ? '2px solid #00ffcc' : '2px dashed #f59e0b',
            padding: '6px 12px',
            margin: '8px auto',
            maxWidth: '480px',
            textAlign: 'center',
            fontSize: '12px',
            color: opponentReady ? '#00ffcc' : '#f59e0b',
            letterSpacing: '1px'
          }}
        >
          {opponentReady ? '[ 對手已就緒！等待您出征 ]' : '[ 對手正在策劃佈署中... ]'}
        </div>

        {/* 即時情報橫條 */}
        {inspectedTerrainIndex !== null && (() => {
          const activeTerrains = (isResolving && pendingResult?.battles)
            ? pendingResult.battles.map(bt => bt.terrain)
            : currentTerrains;
          const targetTerrain = activeTerrains[inspectedTerrainIndex];
          if (!targetTerrain) return null;
          return (
            <div
              className="terrain-stage-intel-bar"
              onClick={() => setInspectedTerrainIndex(null)}
            >
              <span style={{ color: targetTerrain.color, fontWeight: 'bold' }}>
                [ {targetTerrain.name} · 倍率 x{targetTerrain.weight} ]
              </span>
              <span style={{ color: '#cbd5e1' }}>
                {targetTerrain.description}
              </span>
              <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '10px' }}>
                [ 點擊收起 ]
              </span>
            </div>
          );
        })()}

        {/* 三大動態戰場佈署區 */}
        <div className="battlefield">
          {myDeployment.map((playerChar, i) => {
            const b = battleLogs[i];
            const isClashing = resolveStep === i;
            const hasDealt = dealStep > i || resolveStep >= 0;
            // 優先使用當前交鋒真實戰場，保證雙人連機對戰之橫幅與算式倍率 100% 絕對一致
            const activeBattle = b || pendingResult?.battles?.[i];
            const terrain = (isResolving && activeBattle) ? activeBattle.terrain : (currentTerrains[i] || {
              id: 'unknown',
              name: `戰場 ${i + 1}`,
              weight: i + 1,
              icon: 'arena',
              color: '#555',
              description: ''
            });

            // 在 Host 視角：b.player_char 是我方，b.enemy_char 是對手
            // 在 Guest 視角：b.enemy_char 是我方，b.player_char 是對手
            const myBattleChar = isHost ? b?.player_char : b?.enemy_char;
            const opBattleChar = isHost ? b?.enemy_char : b?.player_char;
            const myEff = isHost ? b?.player_eff : b?.enemy_eff;
            const opEff = isHost ? b?.enemy_eff : b?.player_eff;

            const isMyWin = b ? (isHost ? b.winner === 'player' : b.winner === 'enemy') : false;
            const isOpWin = b ? (isHost ? b.winner === 'enemy' : b.winner === 'player') : false;

            return (
              <div key={i} className="field-slot">
                {/* 戰場橫幅 */}
                <TerrainBanner
                  terrain={terrain}
                  index={i}
                  isSelected={inspectedTerrainIndex === i}
                  onSelect={() => setInspectedTerrainIndex(prev => (prev === i ? null : i))}
                />

                {/* 對手陣地 */}
                <div className="slot-card-box">
                  {b && opBattleChar ? (
                    <CardView
                      character={opBattleChar}
                      color="black"
                      isWinner={isOpWin}
                      isLoser={isMyWin}
                      isClashing={isClashing}
                    />
                  ) : hasDealt ? (
                    <div
                      className="card black-piece fly-in"
                      style={{ borderColor: '#000', color: '#fff', fontSize: '22px', fontFamily: 'monospace' }}
                    >
                      ?
                    </div>
                  ) : (
                    <div className="card empty" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
                  )}
                </div>

                {/* 中央算式推演與 VS */}
                <div className="clash-center-box">
                  {!isClashing && (
                    <div style={{ fontSize: '18px', color: '#ffcc00', textShadow: '2px 2px 0 #000' }}>
                      VS
                    </div>
                  )}

                  {b && isClashing && myBattleChar && opBattleChar && (
                    <div className={`equation-tooltip slot-${i}`}>
                      <div className="typewriter type-1">
                        <span style={{ color: '#00ffcc' }}>我方 {myBattleChar.name} ({myEff})</span>
                        <span style={{ margin: '0 6px' }}>vs</span>
                        <span style={{ color: '#ff4747' }}>對手 {opBattleChar.name} ({opEff})</span>
                      </div>
                      <div className="typewriter type-2">
                        我方 {b.player_eff} × x{b.weight} = <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{b.player_score}</span>
                        {' · '}對手 {b.enemy_eff} × x{b.weight} = <span style={{ color: '#ff4747', fontWeight: 'bold' }}>{b.enemy_score}</span>
                        <div style={{ fontSize: '10px', color: '#fbbf24' }}>
                          {b.terrain.name} · 路線分差 {Math.abs(b.player_score - b.enemy_score)}
                        </div>
                      </div>

                      {b.traits_triggered.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '3px' }}>
                          {b.traits_triggered.map((t, idx) => (
                            <div key={idx} className="trait-popup-badge">
                              {t.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 我方陣地 */}
                <div
                  className={`slot-card-box${animatingSlot === i ? ' slot-lock-flash' : ''}`}
                  onClick={() => handleSlotClick(playerChar, i)}
                >
                  <CardView
                    character={playerChar}
                    color="white"
                    isWinner={isMyWin}
                    isLoser={isOpWin}
                    isClashing={isClashing}
                    isDropIn={animatingSlot === i}
                    isRecalling={recallingSlot === i}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ 對手控制面板 (右側 / 電腦版) ============ */}
      <div className="side-panel enemy-panel desktop-only" style={{ marginTop: '36px' }}>
        <div className="hud-box enemy-hud">
          <div style={{ fontWeight: 'bold', color: '#ff4747', letterSpacing: '1px' }}>
            [ {opponentStance || '姿態未揭'} ] 對手 ({isHost ? '挑戰者' : '房主'})
          </div>
          <div className="hp-bar" style={{ justifyContent: 'flex-end' }}>
            {renderHearts(opponentHp)}
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#fbbf24' }}>ATK: {opponentAtk}</div>
        </div>

        {/* 神秘敵方手牌 */}
        <div className="enemy-hand-container">
          {Array.from({ length: 3 }).map((_, i) => {
            const hasFlashed = dealStep > i || resolveStep >= 0;
            return (
              <div
                key={i}
                className="card black-piece"
                style={{
                  opacity: hasFlashed ? 0.3 : 1,
                  borderColor: '#000',
                  color: '#64748b',
                  fontSize: '24px',
                  fontFamily: 'monospace'
                }}
              >
                ?
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ 手機版專用底部手牌托盤 ============ */}
      <div className="mobile-bottom-tray mobile-only">
        <div className="mobile-hand-hint">
          {opponentReady ? '對手已就緒！' : '對手策劃中...'} |{' '}
          {isDeployReady ? '戰備完畢 點擊槽位撤回' : `佈署兵力 (${deployedCount}/3)`}
        </div>

        {renderStanceControls()}

        <div
          className="mobile-hand-container"
          style={{
            opacity: isResolving || myReady ? 0.5 : 1,
            pointerEvents: isResolving || myReady ? 'none' : 'auto'
          }}
        >
          {myHand.map((card, i) => (
            <div key={card.id + i} onClick={() => handleCardClick(card, i)}>
              <CardView
                character={card}
                color="white"
                isUnselectedHand={isDeployReady}
                isLiftingOff={liftingHandIndex === i}
              />
            </div>
          ))}
        </div>

        <button
          className={`mobile-deploy-btn btn ${isDeployReady && !myReady && !isResolving ? 'engage' : ''}`}
          onClick={submitDeployment}
          disabled={!isDeployReady || isResolving || myReady}
        >
          {isResolving
            ? '決鬥交鋒中...'
            : myReady
              ? '已出征 · 等待對手...'
              : isDeployReady
                ? '出征決鬥！'
                : `佈署兵力 (${deployedCount}/3)`}
        </button>
      </div>

      {/* ============ 遊戲結束彈窗 ============ */}
      {gameOver && (
        <div className="overlay" style={{ zIndex: 1100 }}>
          <div
            style={{
              background: '#0b0f19',
              border: `4px solid ${winner === 'me' ? '#00ffcc' : winner === 'draw' ? '#fbbf24' : '#ff4747'}`,
              boxShadow: '8px 8px 0 #000',
              padding: '30px 20px',
              textAlign: 'center',
              width: '90%',
              maxWidth: '460px'
            }}
          >
            <h1
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 3.6rem)',
                color: winner === 'me' ? '#00ffcc' : winner === 'draw' ? '#fbbf24' : '#ff4747',
                textShadow: '4px 4px 0 #000',
                margin: '0 0 10px 0',
                letterSpacing: '3px'
              }}
            >
              {winner === 'me' ? 'VICTORY' : winner === 'draw' ? 'DRAW' : 'DEFEAT'}
            </h1>
            <div style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
              {winner === 'me' ? '雲端博弈，棋開得勝！' : winner === 'draw' ? '五回合戰平，再戰一局見分曉！' : '旗鼓相當，再戰一局見分曉！'}
            </div>

            {earnedReward && (
              <div
                style={{
                  margin: '0 auto 20px auto',
                  padding: '8px 16px',
                  background: 'rgba(234, 179, 8, 0.15)',
                  border: '2px solid #eab308',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#fef08a'
                }}
              >
                <span>[ 對局軍餉 ]</span>
                <span style={{ fontWeight: 'bold', color: '#ffea79' }}>+{earnedReward.amount} G</span>
                <span style={{ color: '#cbd5e1', fontSize: '11px' }}>({earnedReward.text})</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn engage"
                onClick={handleRequestRematch}
                disabled={rematchRequestedByMe}
              >
                {rematchRequestedByMe ? '已發出再戰邀請...' : '再戰一局！'}
              </button>
              <button
                className="btn"
                style={{ background: '#334155' }}
                onClick={() => {
                  soundManager.playSfx('click');
                  networkManager.cleanup();
                  onExit();
                }}
              >
                返回大廳
              </button>
            </div>

            {rematchRequestedByOpponent && !rematchRequestedByMe && (
              <div style={{ marginTop: '14px', color: '#00ffcc', fontSize: '13px' }}>
                [ 對手請求再戰一局！點擊上方按鈕即可開戰 ]
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ 對手中斷連線通知 ============ */}
      {opponentDisconnected && !gameOver && (
        <div className="overlay" style={{ zIndex: 1300 }}>
          <div
            style={{
              background: '#0f172a',
              border: '4px solid #ff4747',
              boxShadow: '8px 8px 0 #000',
              padding: '24px',
              textAlign: 'center',
              width: '90%',
              maxWidth: '420px',
              color: '#fff'
            }}
          >
            <h3 style={{ color: '#ff4747', margin: '0 0 10px 0', fontSize: '18px' }}>
              [ 連線已中斷 ]
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '20px' }}>
              對手已離開房間或網路連線中斷。
            </p>
            <button
              className="btn"
              style={{ background: '#dc2626', width: '100%' }}
              onClick={() => {
                soundManager.playSfx('click');
                networkManager.cleanup();
                onExit();
              }}
            >
              返回主選單
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
