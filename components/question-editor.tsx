'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  GripVertical,
  ImagePlus,
  LockKeyhole,
  Pencil,
  Plus,
  Trash2,
  MessageCirclePlus,
  X,
} from 'lucide-react';
import { Wordmark } from '@/components/wordmark';
import {
  cloudMode,
  roomFromLocation,
  roomUrl,
  type SavedRoom,
} from '@/lib/room-service';
import { trackEvent } from '@/components/analytics';
import type {
  QuestionTemplate,
  RoomQuestion,
} from '@/lib/firebase-room-service';
import {
  defaultMoodPointsFor,
  MoodConfigurator,
  type MoodPoint,
} from '@/components/mood-configurator';
import {
  TemplatePreview,
  parseDrawing,
  parseMapBubbles,
  parseMatrixLabels,
  type DrawingStroke,
  type MapBubble,
  type MatrixLabels,
} from '@/components/template-preview';
import { AccountMenu } from '@/components/account-menu';

const templates: { id: QuestionTemplate; name: string; hint: string }[] = [
  { id: 'mood', name: '気分', hint: '4つの表情' },
  { id: 'world', name: '世界地図', hint: '世界のどこ？' },
  { id: 'japan', name: '日本地図', hint: '日本のどこ？' },
  { id: 'matrix', name: '2×2', hint: '2つの軸で整理' },
  { id: 'free', name: '自由ボード', hint: '自由にピンを置く' },
  { id: 'image', name: '画像を使う', hint: '写真・画像の上に置く' },
];

export default function QuestionEditor() {
  const [room, setRoom] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [questions, setQuestions] = useState<RoomQuestion[]>([]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [template, setTemplate] = useState<QuestionTemplate>('mood');
  const [templateSelected, setTemplateSelected] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [moodPoints, setMoodPoints] = useState<MoodPoint[]>(
    defaultMoodPointsFor(4),
  );
  const [mapBubbles, setMapBubbles] = useState<MapBubble[]>([]);
  const [matrixLabels, setMatrixLabels] = useState<MatrixLabels>({});
  const [drawing, setDrawing] = useState<DrawingStroke[]>([]);
  const [drawingColor, setDrawingColor] = useState('#276877');
  const [drawingWidth, setDrawingWidth] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  useEffect(() => {
    const code = roomFromLocation();
    setRoom(code);
    if (!code || !cloudMode) { setQuestionsLoaded(true); return; }
    Promise.all([
      import('@/lib/firebase-room-service'),
      import('@/lib/room-service'),
    ])
      .then(async ([service, rooms]) => {
        const saved = ((await rooms.getSavedRooms()) as SavedRoom[]).find(
          (item) => item.id === code,
        );
        setTitle(saved?.title || '新しい部屋');
        setQuestions(await service.getRoomQuestions(code));
      })
      .catch(() =>
        setMessage('質問を読み込めませんでした。接続を確認してください。'),
      )
      .finally(() => setQuestionsLoaded(true));
  }, []);
  async function refresh() {
    const service = await import('@/lib/firebase-room-service');
    setQuestions(await service.getRoomQuestions(room));
  }
  const currentLayout = () =>
    template === 'mood'
      ? JSON.stringify(moodPoints)
      : template === 'world' || template === 'japan'
        ? JSON.stringify({ bubbles: mapBubbles })
        : template === 'free'
          ? JSON.stringify({ drawing })
          : template === 'matrix'
            ? JSON.stringify({ matrixLabels })
            : '';
  async function save() {
    if (!draft.trim() || !room) return;
    setBusy(true);
    setMessage('');
    try {
      const service = await import('@/lib/firebase-room-service');
      const existing = questions.find((q) => q.id === editing);
      await service.saveRoomQuestion(room, {
        id: editing || crypto.randomUUID().replaceAll('-', '').slice(0, 12),
        text: draft,
        order: existing?.order || questions.length + 1,
        template,
        caption: '',
        imageUrl,
        layout: currentLayout(),
        soundEnabled,
      });
      setDraft('');
      setEditing(null);
      setAdding(false);
      setStep(1);
      await refresh();
    } catch {
      setMessage('保存できませんでした。もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!confirm('この質問を削除しますか？')) return;
    setBusy(true);
    try {
      const service = await import('@/lib/firebase-room-service');
      await service.deleteRoomQuestion(room, id);
      await refresh();
    } catch {
      setMessage('削除できませんでした。もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  }
  const dragRowRefs = useRef(new Map<string, HTMLElement>());
  const dragInfo = useRef<{ id: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  function handleDragPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    id: string,
  ) {
    if (busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragInfo.current = { id };
    setDraggingId(id);
  }
  function handleDragPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragInfo.current) return;
    const draggedId = dragInfo.current.id;
    const draggedIndex = questions.findIndex((q) => q.id === draggedId);
    if (draggedIndex === -1) return;
    const y = event.clientY;
    for (let targetIndex = 0; targetIndex < questions.length; targetIndex++) {
      const question = questions[targetIndex];
      if (question.id === draggedId) continue;
      const el = dragRowRefs.current.get(question.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const movingDown = targetIndex > draggedIndex;
      if ((movingDown && y > mid) || (!movingDown && y < mid)) {
        const next = [...questions];
        const [item] = next.splice(draggedIndex, 1);
        next.splice(targetIndex, 0, item);
        setQuestions(next);
        break;
      }
    }
  }
  async function handleDragPointerUp() {
    if (!dragInfo.current) return;
    dragInfo.current = null;
    setDraggingId(null);
    try {
      const service = await import('@/lib/firebase-room-service');
      await service.reorderRoomQuestions(room, questions);
    } catch {
      setMessage('順番を変更できませんでした。');
      await refresh();
    }
  }
  if (!room)
    return (
      <main className="student-shell">
        <p>部屋を作成してから質問を準備してください。</p>
      </main>
    );
  const openComposer = (question?: RoomQuestion) => {
    const questionTemplate = question?.template || 'mood';
    setEditing(question?.id || null);
    setDraft(question?.text || '');
    setTemplate(questionTemplate);
    setTemplateSelected(!!question);
    setImageUrl(question?.imageUrl || '');
    setSoundEnabled(question?.soundEnabled === true);
    try {
      setMoodPoints(
        questionTemplate === 'mood' && question?.layout
          ? JSON.parse(question.layout)
          : defaultMoodPointsFor(4),
      );
      setMapBubbles(
        questionTemplate === 'world' || questionTemplate === 'japan'
          ? parseMapBubbles(question?.layout)
          : [],
      );
      setDrawing(
        questionTemplate === 'free' ? parseDrawing(question?.layout) : [],
      );
      setMatrixLabels(
        questionTemplate === 'matrix'
          ? parseMatrixLabels(question?.layout)
          : {},
      );
    } catch {
      setMoodPoints(defaultMoodPointsFor(4));
      setMapBubbles([]);
      setDrawing([]);
      setMatrixLabels({});
    }
    setAdding(true);
    setStep(1);
  };
  const addBubble = () =>
    setMapBubbles([
      ...mapBubbles,
      { id: crypto.randomUUID(), text: 'ここに入力', x: 50, y: 50 },
    ]);
  const complete = [!!draft.trim(), templateSelected, templateSelected];
  return (
    <main className="editor-shell">
      <header className="student-header">
        <Wordmark href={roomUrl('home')} />
        <div className="student-header-actions"><span className="eyebrow">Powered by AI Sensei</span><AccountMenu /></div>
      </header>
      <section className="editor-card">
        <a className="back-button" href={roomUrl('home')}>
          <ArrowLeft size={17} />
          部屋一覧
        </a>
        <h1 className={title ? undefined : 'editor-title-loading'}>{title || ' '}</h1>
        <button
          type="button"
          className="editor-add-button"
          onClick={() => openComposer()}
        >
          <Plus size={17} />
          質問を追加
        </button>
        {adding && (
          <section className="composer">
            <div className="composer-topline">
              <div className="composer-tabs" role="tablist">
                {(['質問', '画面', '詳細'] as const).map((name, index) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={step === index + 1}
                    className={step === index + 1 ? 'is-current' : ''}
                    onClick={() => setStep((index + 1) as 1 | 2 | 3)}
                    key={name}
                  >
                    {complete[index] && <Check size={14} />} {name}
                  </button>
                ))}
              </div>
              {step === 1 && !templateSelected && (
                <p className="composer-next-step">
                  次は「画面」を設定しましょう。
                </p>
              )}
            </div>
            {step === 1 && (
              <textarea
                id="question-text"
                autoFocus
                value={draft}
                maxLength={160}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="ここに質問を入力"
                aria-label="質問"
              />
            )}
            {step === 2 && (
              <>
                <p className="composer-label">表示する画面を選ぶ</p>
                <div className="template-grid">
                  {templates.map((item) => (
                    <button
                      type="button"
                      disabled={item.id === 'image'}
                      className={`template-card ${template === item.id ? 'is-selected' : ''} ${item.id === 'image' ? 'is-locked' : ''}`}
                      onClick={() => {
                        setTemplate(item.id);
                        setTemplateSelected(true);
                      }}
                      key={item.id}
                    >
                      <span className={`template-art ${item.id}`}>
                        {item.id === 'image' ? (
                          <ImagePlus size={24} />
                        ) : item.id === 'mood' ? (
                          '🙂'
                        ) : item.id === 'world' ? (
                          '🌍'
                        ) : item.id === 'japan' ? (
                          '🗾'
                        ) : item.id === 'matrix' ? (
                          '＋'
                        ) : (
                          '·'
                        )}
                      </span>
                      <strong>
                        {item.name}{' '}
                        {item.id === 'image' && <LockKeyhole size={13} />}
                      </strong>
                      <small>
                        {item.id === 'image' ? '準備中' : item.hint}
                      </small>
                    </button>
                  ))}
                </div>
                <TemplatePreview
                  template={template}
                  moodPoints={moodPoints}
                  bubbles={mapBubbles}
                  drawing={drawing}
                  matrixLabels={matrixLabels}
                  preview
                  interactivePreview
                  soundEnabled={soundEnabled}
                />
              </>
            )}
            {step === 3 && (
              <>
                {template === 'mood' && (
                  <MoodConfigurator
                    points={moodPoints}
                    onChange={setMoodPoints}
                  />
                )}{' '}
                {template === 'matrix' && (
                  <section
                    className="matrix-label-editor"
                    aria-label="軸のラベルを編集"
                  >
                    <label>
                      上
                      <input
                        value={matrixLabels.top || ''}
                        maxLength={20}
                        placeholder="高い"
                        aria-label="上のラベル"
                        onChange={(e) =>
                          setMatrixLabels({
                            ...matrixLabels,
                            top: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      下
                      <input
                        value={matrixLabels.bottom || ''}
                        maxLength={20}
                        placeholder="低い"
                        aria-label="下のラベル"
                        onChange={(e) =>
                          setMatrixLabels({
                            ...matrixLabels,
                            bottom: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      左
                      <input
                        value={matrixLabels.left || ''}
                        maxLength={20}
                        placeholder="低い"
                        aria-label="左のラベル"
                        onChange={(e) =>
                          setMatrixLabels({
                            ...matrixLabels,
                            left: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      右
                      <input
                        value={matrixLabels.right || ''}
                        maxLength={20}
                        placeholder="高い"
                        aria-label="右のラベル"
                        onChange={(e) =>
                          setMatrixLabels({
                            ...matrixLabels,
                            right: e.target.value,
                          })
                        }
                      />
                    </label>
                  </section>
                )}
                {(template === 'world' || template === 'japan') && (
                  <section className="bubble-editor">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={addBubble}
                    >
                      <MessageCirclePlus size={17} />
                      吹き出しを追加
                    </button>
                    {mapBubbles.map((bubble) => (
                      <div className="bubble-row" key={bubble.id}>
                        <input
                          value={bubble.text}
                          maxLength={30}
                          aria-label="吹き出しの文字"
                          onChange={(e) =>
                            setMapBubbles(
                              mapBubbles.map((item) =>
                                item.id === bubble.id
                                  ? { ...item, text: e.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          aria-label="吹き出しを削除"
                          onClick={() =>
                            setMapBubbles(
                              mapBubbles.filter(
                                (item) => item.id !== bubble.id,
                              ),
                            )
                          }
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <p>
                      吹き出しを長押しして、そのまま好きな場所へ動かせます。
                    </p>
                  </section>
                )}
                {template === 'free' && (
                  <section
                    className="drawing-tools"
                    aria-label="お絵描きの設定"
                  >
                    <label>
                      ペンの色
                      <input
                        type="color"
                        value={drawingColor}
                        onChange={(event) =>
                          setDrawingColor(event.target.value)
                        }
                      />
                    </label>
                    <label>
                      ペンの太さ <span>{drawingWidth}</span>
                      <input
                        type="range"
                        min="2"
                        max="16"
                        step="1"
                        value={drawingWidth}
                        onChange={(event) =>
                          setDrawingWidth(Number(event.target.value))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={drawing.length === 0}
                      onClick={() => setDrawing(drawing.slice(0, -1))}
                    >
                      ひとつ戻す
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={drawing.length === 0}
                      onClick={() => setDrawing([])}
                    >
                      全て消す
                    </button>
                  </section>
                )}
                <TemplatePreview
                  template={template}
                  moodPoints={moodPoints}
                  bubbles={mapBubbles}
                  drawing={drawing}
                  matrixLabels={matrixLabels}
                  editable={
                    template === 'world' ||
                    template === 'japan' ||
                    template === 'free'
                  }
                  onBubblesChange={setMapBubbles}
                  onDrawingChange={setDrawing}
                  drawingColor={drawingColor}
                  drawingWidth={drawingWidth}
                  preview
                  interactivePreview
                  soundEnabled={soundEnabled}
                />
                <section className="sound-setting" aria-label="ピンの効果音">
                  <div className="sound-setting-row">
                    <label className="sound-switch">
                      <span>ピンを置いたときの音</span>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={soundEnabled}
                        onChange={(event) => setSoundEnabled(event.target.checked)}
                      />
                      <span className="sound-switch-track" aria-hidden="true"><span /></span>
                      <small>{soundEnabled ? 'ON' : 'OFF'}</small>
                    </label>
                  </div>
                </section>
              </>
            )}
            <div className="composer-actions">
              <button
                type="button"
                className="text-button"
                onClick={() => setAdding(false)}
              >
                キャンセル
              </button>
              <span
                className="composer-save-wrap"
                data-tooltip={
                  !templateSelected
                    ? '「画面」の設定が完了していません'
                    : undefined
                }
              >
                <button
                  className="primary-button"
                  disabled={
                    busy ||
                    !draft.trim() ||
                    !templateSelected ||
                    template === 'image'
                  }
                  onClick={save}
                >
                  {editing ? '更新' : '保存'}
                </button>
              </span>
            </div>
          </section>
        )}
        <div className="prepared-questions">
          {!questionsLoaded ? (
            <p className="history-message">質問を読み込んでいます…</p>
          ) : questions.length === 0 ? (
            <p className="history-message">
              まだ質問はありません。「質問を追加」から準備しましょう。
            </p>
          ) : (
            questions.map((question, index) => (
              <article
                className={`prepared-question${draggingId === question.id ? ' is-dragging' : ''}`}
                key={question.id}
                ref={(el) => {
                  if (el) dragRowRefs.current.set(question.id, el);
                  else dragRowRefs.current.delete(question.id);
                }}
              >
                <div className="question-order">
                  <button
                    type="button"
                    className="question-drag-handle"
                    aria-label="ドラッグして並べ替え"
                    onPointerDown={(e) => handleDragPointerDown(e, question.id)}
                    onPointerMove={handleDragPointerMove}
                    onPointerUp={handleDragPointerUp}
                    onPointerCancel={handleDragPointerUp}
                  >
                    <GripVertical size={17} />
                  </button>
                  <span>{index + 1}</span>
                </div>
                <strong>{question.text}</strong>
                <div className="question-actions">
                  <button
                    aria-label="編集"
                    onClick={() => openComposer(question)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button aria-label="削除" onClick={() => remove(question.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        <a
          className="primary-button editor-start"
          href={roomUrl('host', room)}
          onClick={() => trackEvent('open_saved_room')}
        >
          <Copy size={17} /> 主催者画面を開く
        </a>
        <p role="status" className="form-error">
          {message}
        </p>
      </section>
    </main>
  );
}
