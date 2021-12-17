import React, { memo, useContext, useCallback, HTMLAttributes, forwardRef } from 'react';
import cc from 'classcat';
import shallow from 'zustand/shallow';

import { useStore, useStoreApi } from '../../store';
import NodeIdContext from '../../contexts/NodeIdContext';
import { HandleProps, Connection, ReactFlowState, Position } from '../../types';
import { checkElementBelowIsValid, onMouseDown } from './handler';
import { getHostForElement } from '../../utils';

const alwaysValid = () => true;

export type HandleComponentProps = HandleProps & Omit<HTMLAttributes<HTMLDivElement>, 'id'>;

const selector = (s: ReactFlowState) => ({
  onConnectAction: s.onConnect,
  onConnectStart: s.onConnectStart,
  onConnectStop: s.onConnectStop,
  onConnectEnd: s.onConnectEnd,
  connectionMode: s.connectionMode,
  connectionStartHandle: s.connectionStartHandle,
});

const Handle = forwardRef<HTMLDivElement, HandleComponentProps>(
  (
    {
      type = 'source',
      position = Position.Top,
      isValidConnection = alwaysValid,
      isConnectable = true,
      id,
      onConnect,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const store = useStoreApi();
    const nodeId = useContext(NodeIdContext) as string;
    const { onConnectAction, onConnectStart, onConnectStop, onConnectEnd, connectionMode, connectionStartHandle } =
      useStore(selector, shallow);

    const handleId = id || null;
    const isTarget = type === 'target';

    const onConnectExtended = useCallback(
      (params: Connection) => {
        onConnectAction?.(params);
        onConnect?.(params);
      },
      [onConnectAction, onConnect]
    );

    const onMouseDownHandler = useCallback(
      (event: React.MouseEvent) => {
        onMouseDown(
          event,
          handleId,
          nodeId,
          store.setState,
          onConnectExtended,
          isTarget,
          isValidConnection,
          connectionMode,
          undefined,
          undefined,
          onConnectStart,
          onConnectStop,
          onConnectEnd
        );
      },
      [
        handleId,
        nodeId,
        onConnectExtended,
        isTarget,
        isValidConnection,
        connectionMode,
        onConnectStart,
        onConnectStop,
        onConnectEnd,
      ]
    );

    const onClick = useCallback(
      (event: React.MouseEvent) => {
        if (!connectionStartHandle) {
          onConnectStart?.(event, { nodeId, handleId, handleType: type });
          store.setState({ connectionStartHandle: { nodeId, type, handleId } });
        } else {
          const doc = getHostForElement(event.target as HTMLElement);
          const { connection, isValid } = checkElementBelowIsValid(
            event as unknown as MouseEvent,
            connectionMode,
            connectionStartHandle.type === 'target',
            connectionStartHandle.nodeId,
            connectionStartHandle.handleId || null,
            isValidConnection,
            doc
          );

          onConnectStop?.(event as unknown as MouseEvent);

          if (isValid) {
            onConnectExtended(connection);
          }

          onConnectEnd?.(event as unknown as MouseEvent);

          store.setState({ connectionStartHandle: null });
        }
      },
      [
        connectionStartHandle,
        onConnectStart,
        onConnectExtended,
        onConnectStop,
        onConnectEnd,
        isTarget,
        nodeId,
        handleId,
        type,
      ]
    );

    const handleClasses = cc([
      'react-flow__handle',
      `react-flow__handle-${position}`,
      'nodrag',
      className,
      {
        source: !isTarget,
        target: isTarget,
        connectable: isConnectable,
        connecting:
          connectionStartHandle?.nodeId === nodeId &&
          connectionStartHandle?.handleId === handleId &&
          connectionStartHandle?.type === type,
      },
    ]);

    return (
      <div
        data-handleid={handleId}
        data-nodeid={nodeId}
        data-handlepos={position}
        className={handleClasses}
        onMouseDown={onMouseDownHandler}
        onClick={onClick}
        ref={ref}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Handle.displayName = 'Handle';

export default memo(Handle);
