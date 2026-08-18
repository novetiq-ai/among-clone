'use client';

import React from 'react';
import { TaskDefinition, PlayerColor } from '@/types/game';
import { WireTask } from './WireTask';
import { SwipeCardTask } from './SwipeCardTask';
import { ManifoldsTask } from './ManifoldsTask';
import { MedbayScanTask } from './MedbayScanTask';
import { DownloadTask } from './DownloadTask';
import { DivertPowerTask } from './DivertPowerTask';
import { PrimeShieldsTask } from './PrimeShieldsTask';
import { ClearAsteroidsTask } from './ClearAsteroidsTask';
import { CalibrateDistributorTask } from './CalibrateDistributorTask';
import { CleanO2FilterTask } from './CleanO2FilterTask';
import { ChartCourseTask } from './ChartCourseTask';
import { AlignEngineTask } from './AlignEngineTask';
import { EmptyGarbageTask } from './EmptyGarbageTask';
import { StartReactorTask } from './StartReactorTask';
import { InspectSampleTask } from './InspectSampleTask';
import { RefuelEnginesTask } from './RefuelEnginesTask';
import { FixLightsTask } from './FixLightsTask';
import { FixReactorTask } from './FixReactorTask';

interface TaskModalProps {
  task: TaskDefinition;
  playerColor: PlayerColor;
  playerName: string;
  onComplete: () => void;
  onClose: () => void;
}

export function TaskModal({
  task,
  playerColor,
  playerName,
  onComplete,
  onClose,
}: TaskModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {task.type === 'wires' && (
        <WireTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'swipe_card' && (
        <SwipeCardTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'manifolds' && (
        <ManifoldsTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'medbay_scan' && (
        <MedbayScanTask
          playerColor={playerColor}
          playerName={playerName}
          onComplete={onComplete}
          onClose={onClose}
        />
      )}
      {task.type === 'download_data' && (
        <DownloadTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'divert_power' && (
        <DivertPowerTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'prime_shields' && (
        <PrimeShieldsTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'clear_asteroids' && (
        <ClearAsteroidsTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'calibrate_distributor' && (
        <CalibrateDistributorTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'clean_o2_filter' && (
        <CleanO2FilterTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'chart_course' && (
        <ChartCourseTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'align_engine' && (
        <AlignEngineTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'empty_garbage' && (
        <EmptyGarbageTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'start_reactor' && (
        <StartReactorTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'inspect_sample' && (
        <InspectSampleTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'refuel_engines' && (
        <RefuelEnginesTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'fix_lights' && (
        <FixLightsTask onComplete={onComplete} onClose={onClose} />
      )}
      {task.type === 'fix_reactor' && (
        <FixReactorTask onComplete={onComplete} onClose={onClose} />
      )}
    </div>
  );
}
