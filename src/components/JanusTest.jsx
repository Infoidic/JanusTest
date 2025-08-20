import React, { useEffect, useMemo, useRef, useState } from 'react'
// import Janus from "janus-gateway";
import adapter from 'webrtc-adapter'
import { useMeetSocket } from '../hooks/useMeetSocket'
import VideoRemote from './remoteVideo'
window.adapter = adapter

// const Janus = window.janus

const JanusTest = () => {
	const janusRef = useRef(null)
	const pluginHandleRef = useRef(null)
	const screenSharePluginRef = useRef(null)
	const screenVideoRef = useRef(null)
	const localVideoRef = useRef(null)
	const localStreamRef = useRef(null)
	const [janusInitialized, setJanusInitialized] = useState(false)
	const [remoteFeeds, setRemoteFeeds] = useState([])
	const [ownerShareScreen, setOwnerShareScreen] = useState({})
	const ownerShareScreenRef = useRef({})
	const [currentSubstream, setCurrentSubstream] = useState(0)
	const currentRemoteSubstreamRef = useRef(currentSubstream)
	const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

	const [socketReady, setSocketReady] = useState(false)
	const [isRecord, setIsRecord] = useState(false)

	const [meetIdUser, setMeetIdUser] = useState('')
	const [tokenUser, setTokenUser] = useState('')

	const [remoteUsers, setRemoteUsers] = useState([])
	const [currentUser, setCurrentUser] = useState({})
	const currentUserRef = useRef(currentUser)

	// Record
	const [currentRecord, setCurrentRecord] = useState(false)
	const currentRecordRef = useRef()

	// provisional
	const meetId = useRef('33123b53-3bfb-4c19-8559-90e89f467b2e')
	//rafaelromariorv@gmail.com
	const tokenUserOne = useRef(
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYzODI4NjQwLCJpYXQiOjE3NTUxODg2NDAsImp0aSI6IjZkYjgyYjhlOTQ0MTRhMzU5MmU4MTNmMTRkN2UwOTc0IiwidXNlcl9pZCI6ImQ2OWE1YzU1LTgxZjctNDlmMS1iZGY0LTM0ZGQ5MTQxOGRhMiJ9.Ez3zKzagm_Brnj9BtGv0nJGCacBCEcvMsbYdLMJssrA'
	)
	//Fabian
	const tokenUserTwo = useRef(
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYzODI4NzE2LCJpYXQiOjE3NTUxODg3MTYsImp0aSI6IjVlYTczN2QwZmYwNjQyNTM4NmZiYmNhN2IwMmVkNGM0IiwidXNlcl9pZCI6ImM2ZTNkOTIzLWQxNGQtNDYwYi1iYWY5LTcxMzIwOWRjNmZmMyJ9.sd3ctgveaIynP7Mb2nd5WAyfogfZ4c0WpAK5jU4GjXE'
	)

	const tokenUserThree = useRef(
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYzODQ2NDUyLCJpYXQiOjE3NTUyMDY0NTIsImp0aSI6IjY5ZDMwMTUwY2IyYTQ4MWJiZmQ1NDNhYTllMjBmNTJlIiwidXNlcl9pZCI6ImNhM2ViYzJhLTFiY2MtNDdkZi05ZDBhLWE4NjgzZWQ3NWQ3OSJ9.AipQrRiOv3P2iyIp09IpYjincP9J87DCQahG18LRGS0'
	)

	const [isScreenSharing, setIsScreenSharing] = useState(false)
	const screenTrackRef = useRef(null)
	const audioTrackRef = useRef(null)
	const isSharing = useRef(null)

	const handleUserConnect = (data) => {
		if (data && data.data) {
			console.log('connected user ', data.data)
			setCurrentUser(data.data)
			sendMessage({ type: 'users' })
			setTimeout(() => {
				sendMessage({ type: 'get_record_meet' })
			}, 1000)
		} else {
			console.warn('Invalid user data received', data)
		}
	}

	const handleUserDisconnect = (data) => {
		console.log('handleUserDisconnect')
		setRemoteUsers((prevRemote) => {
			const update = prevRemote.filter(
				(user) => user.id_user !== data.data.id_user
			)
			console.log('handleUserDisconnect:', update)
			return update
		})
	}

	const addIdJanusToSocket = (id_janus) => {
		//setCurrentUser(prev => ({
		//  ...prev,
		//  id_janus: id_janus
		//}));
		sendMessage({
			type: 'add_id_janus',
			id_janus: id_janus,
		})
	}

	const addIdJanusShareScreenToSocket = (id_janus) => {
		//setCurrentUser(prev => ({
		//  ...prev,
		//  id_janus: id_janus
		//}));
		sendMessage({
			type: 'add_id_janus_share_screen',
			id_janus_share_screen: id_janus,
		})
	}

	const handleNewUserConnect = (data) => {
		setRemoteUsers((prevRemote) => {
			const existingUser = prevRemote.find(
				(user) => user.id_user === data.data.id_user
			)
			if (!existingUser) {
				console.log('Add new socket user remote')
				const update = [...prevRemote, data.data]
				console.log('handleNewUserConnect: ', JSON.stringify(update))
				console.log('xue new user: ' + JSON.stringify(update))
				return update
			}
			return prevRemote
		})
	}

	const handleChangeStatus = (data) => {
		if (data.status === 'success') {
			const updatedUser = data.data
			if (currentUserRef.current.id_user == updatedUser.id_user) {
				setCurrentUser(data.data)
				if (data.action === 'status_microphone') {
					pluginHandleRef.current.send({
						message: {
							request: 'configure',
							audio: data.data.status_microphone,
						},
					})
				}
				if (data.action === 'status_video') {
					pluginHandleRef.current.send({
						message: { request: 'configure', video: data.data.status_video },
					})
				}
			} else {
				console.log('xue remote update: ' + JSON.stringify(data))
				setRemoteUsers((prevUsers) =>
					prevUsers.map((user) =>
						user.id_user === updatedUser.id_user
							? { ...user, ...updatedUser }
							: user
					)
				)
			}
		} // el error que?
	}

	const handleAddPreviousUsers = (data) => {
		const filteredUsers = data.data.filter(
			(user) => user.id_user !== currentUserRef.current.id_user
		)

		setRemoteUsers(filteredUsers)
	}

	const handleChangeStatusUserMeet = (data) => {
		if (data.status === 'success') {
			if (currentUserRef.current.id_user == data.data.id_user) {
				setCurrentUser(data.data)
				console.log('xue1 ' + JSON.stringify(data.data))
				if (
					data.action === 'microphone' ||
					data.action === 'status_microphone'
				) {
					console.log('xue1 jaja')
					configurePublisherAudioRemote(data.data.status_microphone)
				}
				if (data.action === 'video' || data.action === 'status_video') {
					console.log('xue1 jaja: ' + data.data.status_video)
					configurePublisherVideoRemote(data.data.status_video)
				}
			} else {
				handleChangeStatus(data)
			}
		}
		if (data.status === 'error') {
			alert('Error: ' + data.message)
		}
	}

	const handleChangeStatusAllParticipants = (data) => {
		if (data.status === 'success') {
			data.data.forEach((userData) => {
				console.log('xue all 00')
				if (currentUserRef.current.id_user == userData.id_user) {
					console.log(userData)
					setCurrentUser(userData)
					console.log('xue all 01')

					if (
						data.action === 'microphone' ||
						data.action === 'status_microphone'
					) {
						configurePublisherAudioRemote(userData.status_microphone)
						console.log('xue all')
						console.log('xue all' + userData.status_microphone)
						console.log('xue all' + userData.name)
					}

					if (data.action === 'video' || data.action === 'status_video') {
						configurePublisherVideoRemote(userData.status_video)
					}
				} else {
					// Para otros usuarios
					handleChangeStatus({
						...data,
						data: userData,
					})
				}
			})
		}

		if (data.status === 'error') {
			alert('Error: ' + data.message)
		}
	}

	const handleRecordMeet = (data) => {
		if (data.status === 'success') {
			setCurrentRecord(data.data)
			currentRecordRef.current = data.data
			console.log('xue record handle: data.data ' + JSON.stringify(data.data))
			console.log(
				'xue record handle: currentRecord ' +
					currentRecordRef.current?.recording
			)
			if (typeof data.data?.recording === 'boolean') recordVideoRoom()
		}
	}

	const socketHandlers = {
		user_connect: handleUserConnect,
		user_disconnect: handleUserDisconnect,
		new_user_connect: handleNewUserConnect,
		add_id_janus: handleChangeStatus,
		add_id_janus_share_screen: handleChangeStatus,
		change_status: handleChangeStatus,
		users: handleAddPreviousUsers,
		change_status_user_meet: handleChangeStatusUserMeet,
		change_status_all_participants: handleChangeStatusAllParticipants,
		// handle records:
		get_record_meet: handleRecordMeet,
		create_record_meet: handleRecordMeet,
		stop_record_meet: handleRecordMeet,
	}

	const handleSocketMessage = (data) => {
		console.log('🔸 Mensaje desde backend:', data)
		if (!data?.type) {
			console.warn('⚠️ Messaje receive without type valid:', data)
			alert('⚠️ Messaje receive without type valid:' + JSON.stringify(data))
			return
		}

		const handler = socketHandlers[data.type]
		if (handler) {
			handler(data)
		} else {
			console.warn('❓ Type no handle:', data.type)
		}
	}

	const disconnectAll = () => {
		console.log('🔌 Desconectando usuario...')

		// Cerrar el socket
		closeSocket()

		// Cerrar Janus si está conectado
		if (pluginHandleRef.current) {
			pluginHandleRef.current.send({ message: { request: 'unpublish' } })
			pluginHandleRef.current.hangup()
			pluginHandleRef.current.detach()
			pluginHandleRef.current = null
		}

		if (janusRef.current) {
			janusRef.current.destroy()
			janusRef.current = null
		}

		// Limpieza de estado local
		setRemoteFeeds([])
		setRemoteUsers([])
		setCurrentUser({})
		setOwnerShareScreen({})
		setJanusInitialized(false)
		setSocketReady(false)
		setMeetIdUser('')
		setTokenUser('')
	}

	const { connectSocket, sendMessage, closeSocket, isSocketConnect } =
		useMeetSocket({
			//meetId: meetId.current,
			//token: token.current,
			meetId: meetIdUser,
			token: tokenUser,
			onMessage: handleSocketMessage,
			onOpen: () => {
				console.log('🔗 Socket Django listo')
				setSocketReady(true)
			},
			onClose: () => {
				console.log('Socket cerrado, cerrando Janus ...')
				disconnectAll()
			},
			localVideoRef,
		})

	useEffect(() => {
		if (socketReady && !janusInitialized) {
			window.Janus.init({
				debug: 'all',
				callback: () => setJanusInitialized(true),
			})
			// Janus.init({ debug: 'all', callback: () => setJanusInitialized(true) })
		}
	}, [socketReady])

	useEffect(() => {
		if (!janusInitialized) return
		janusRef.current = new window.Janus({
			server: 'wss://webrtc.testlorotest.xyz:8989/janus',
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
			success: attachPlugin,
		})

		return () => {
			if (janusRef.current) {
				janusRef.current.destroy()
				janusRef.current = null
			}
		}
	}, [janusInitialized])

	const attachPlugin = () => {
		janusRef.current.attach({
			plugin: 'janus.plugin.videoroom',
			success: (pluginHandle) => {
				pluginHandleRef.current = pluginHandle
				console.log('xue: ', pluginHandle.id)

				const roomId = meetIdUser // <-- aquí tu uuid dinámico desde props, state, url, etc.

				// 1️⃣ Consultar si la sala existe
				pluginHandle.send({
					message: { request: 'exists', room: roomId },
					success: (result) => {
						if (result.exists) {
							console.log('✅ Sala ya existe, me uno.')
							joinRoom(roomId)
						} else {
							console.log('⚙️ Sala no existe, creando...')
							// 2️⃣ Crear sala
							pluginHandle.send({
								message: {
									request: 'create',
									room: roomId,
									description: 'Sala dinámica',
									publishers: 40,
									bitrate: 3000000,
									fir_freq: 10,
									simulcast: true,
								},
								success: (createResult) => {
									console.log('✅ Sala creada', createResult)
									joinRoom(roomId)
								},
								error: (err) => {
									console.error('❌ Error creando sala:', err)
								},
							})
						}
					},
					error: (err) => {
						console.error('❌ Error consultando sala:', err)
					},
				})
			},
			onmessage: (msg, jsep) => {
				if (msg.videoroom === 'joined') {
					startCamera()
					// Este es id del actual
					//alert("conectado")

					addIdJanusToSocket(msg.id)

					//xue record
					//pluginHandleRef.current.send({
					//  message: {
					//    request: "configure",
					//    record: true,
					//    filename: `/home/video/${meetIdUser}/${currentUser.id_user}`,
					//    bitrate: 512000, // 512 kbps (ajustable)
					//  },
					//});

					if (msg.publishers) {
						msg.publishers.forEach((p) => newRemoteFeed(p.id, p.display))
					}
				}
				if (msg.videoroom === 'event') {
					console.log('xue desp: ', msg)
					if (msg.publishers) {
						msg.publishers.forEach((p) => newRemoteFeed(p.id, p.display))
						msg.publishers.forEach((p) =>
							console.log('xue id' + p.id + 'xue display: ' + p.display)
						)
					}
					if (msg.unpublished || msg.leaving) {
						const leavingId = msg.unpublished || msg.leaving
						setRemoteFeeds((prev) => {
							const toRemove = prev.find((f) => f.feedId === leavingId)
							if (toRemove) toRemove.pluginHandle.detach()
							return prev.filter((f) => f.feedId !== leavingId)
						})
					}
				}
				if (jsep) pluginHandleRef.current.handleRemoteJsep({ jsep })
			},
			onlocaltrack: (track, on) => {
				if (on) {
					if (!localStreamRef.current)
						localStreamRef.current = new MediaStream()
					localStreamRef.current.addTrack(track)
					localVideoRef.current.srcObject = localStreamRef.current
				}
			},
		})
	}

	const joinRoom = (roomId) => {
		pluginHandleRef.current.send({
			message: {
				request: 'join',
				room: roomId,
				ptype: 'publisher',
				display: isMobile ? 'mobile' : 'desktop',
			},
		})
	}

	const recordVideoRoom = () => {
		const datetimeUTC = new Date()
		console.log('xue se va a : ' + currentRecordRef.current?.recording)
		pluginHandleRef.current.send({
			message: {
				request: 'configure',
				record: currentRecordRef.current?.recording,
				filename: `/home/video/${meetIdUser}/${
					currentUserRef.current.id_user
				}_datetime:${datetimeUTC.toISOString()}`,
				bitrate: 512000, // 512 kbps (ajustable)
			},
		})
	}

	const startCamera = async () => {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true,
		})
		localStreamRef.current = stream
		localVideoRef.current.srcObject = stream

		const tracks = stream.getTracks().map((track) => ({
			type: track.kind,
			capture: true,
			recv: false,
			simulcast: track.kind === 'video' && !isMobile,
			...(track.kind === 'video' &&
				!isMobile && {
					sendEncodings: [
						{ rid: 'm', active: true, maxBitrate: 1200000 },
						{ rid: 'l', active: true, maxBitrate: 600000 },
						{ rid: 'h', active: true, maxBitrate: 3000000 },
					],
				}),
		}))

		pluginHandleRef.current.createOffer({
			stream,
			tracks,
			trickle: true,
			success: async (jsep) => {
				// 👈 Aquí aplicamos sendEncodings a nivel RTCRtpSender
				const pc = pluginHandleRef.current.webrtcStuff.pc
				const videoSender = pc
					.getSenders()
					.find((s) => s.track && s.track.kind === 'video')
				if (videoSender && !isMobile) {
					const parameters = videoSender.getParameters()
					parameters.encodings = [
						{ rid: 'm', active: true, maxBitrate: 1200000 },
						{ rid: 'l', active: true, maxBitrate: 600000 },
						{ rid: 'h', active: true, maxBitrate: 3000000 },
					]
					await videoSender.setParameters(parameters)
					console.log(
						'✅ Simulcast encodings seteados correctamente en RTCRtpSender'
					)
				} // Aquí aplicamos sendEncodings a nivel RTCRtpSender

				setTimeout(() => {
					pluginHandleRef.current.send({
						message: {
							request: 'configure',
							audio: currentUser.status_microphone,
							video: currentUser.status_video,
						},
					}) // pasa algo cuando uso en vez de audio video
				}, 2000)

				//setTimeout(() => {
				//  pluginHandleRef.current.send({
				//    message: { request: "configure", video: currentUser.status_video }
				//  }); // pasa algo cuando uso en vez de audio video
				//}, 500);

				pluginHandleRef.current.send({
					message: { request: 'configure', audio: true, video: true },
					jsep,
				})
			},
		})
	}

	const shareScreen = async () => {
		if (isMobile) return alert('Compartir pantalla no disponible en móviles.')

		const screenStream = await navigator.mediaDevices.getDisplayMedia({
			video: true,
			audio: true,
		})
		const screenTrack = screenStream.getVideoTracks()[0]
		screenTrackRef.current = screenTrack
		const audioTrack = screenStream.getAudioTracks()[0]
		audioTrackRef.current = audioTrack

		janusRef.current.attach({
			plugin: 'janus.plugin.videoroom',
			success: (pluginHandle) => {
				screenSharePluginRef.current = pluginHandle

				screenSharePluginRef.current.send({
					message: {
						request: 'join',
						room: meetIdUser,
						ptype: 'publisher',
						display: 'screen-share',
					},
				})

				screenSharePluginRef.current.onmessage = (msg, jsep) => {
					if (msg.videoroom === 'joined') {
						addIdJanusShareScreenToSocket(msg.id)
						screenSharePluginRef.current.createOffer({
							stream: screenStream,
							tracks: [
								{ type: 'video', capture: screenStream },
								{ type: 'audio', capture: screenStream },
							],
							success: (jsep) => {
								screenSharePluginRef.current.send({
									message: {
										request: 'configure',
										audio: true,
										video: true,
									},
									jsep,
								})
								setIsScreenSharing(true)
								configureShareScreen()
							},
							error: (err) =>
								console.error('❌ Error al crear oferta para pantalla:', err),
						})

						//recordVideoRoom(true);
						//pluginHandleRef.current.send({
						//  message: {
						//    request: "configure",
						//    audio: true,
						//    video: true,
						//    record: true,
						//    filename: `grabacion_${msg["room"]}_${myId}`,
						//  },
						//});
					}

					if (jsep) {
						pluginHandle.handleRemoteJsep({ jsep })
					}
				}

				screenTrack.onended = () => {
					console.log('xue in onended')
					stopScreenSharing()
				}
			},
			error: (err) => {
				console.error('❌ Error al conectar plugin de pantalla:', err)
			},
			onlocaltrack: async (track, on) => {
				const pc = screenSharePluginRef.current.webrtcStuff.pc
				const videoSender = pc
					.getSenders()
					.find((s) => s.track && s.track.kind === 'video')
				if (videoSender && screenTrack) {
					await videoSender.replaceTrack(screenTrack)
					console.log('✅ Video reemplazado')
				}

				// Reemplazar audio (opcional)
				const audioSender = pc
					.getSenders()
					.find((s) => s.track && s.track.kind === 'audio')
				if (audioSender && audioTrackRef) {
					await audioSender.replaceTrack(audioTrack)
					console.log('✅ Audio reemplazado')
				}
			},
		})
	}

	const stopScreenSharing = async () => {
		if (!screenTrackRef.current) return
		console.log('xue stopScreenSharing')

		screenTrackRef.current.stop() // Detener el track
		//setIsScreenSharing(false);

		// Esperar a que track de pantalla finalice
		screenSharePluginRef.current.send({ message: { request: 'unpublish' } })
		screenSharePluginRef.current.hangup()
		screenSharePluginRef.current.detach()
		setOwnerShareScreen({})
		screenTrackRef.current = null

		setTimeout(() => {
			if (currentUser.status_screen == true) configureShareScreen()
			addIdJanusShareScreenToSocket(null)
		}, 500)
	}

	const shareScreenOld = async () => {
		if (isMobile) return alert('Compartir pantalla no disponible en móviles.')

		const screenStream = await navigator.mediaDevices.getDisplayMedia({
			video: true,
		})
		const screenTrack = screenStream.getVideoTracks()[0]
		screenTrackRef.current = screenTrack
		//setIsScreenSharing(true); // <-- ahora estamos compartiendo

		const displayStream = new MediaStream([screenTrack])
		localVideoRef.current.srcObject = displayStream

		const sender = pluginHandleRef.current.webrtcStuff.pc
			.getSenders()
			.find((s) => s.track && s.track.kind === 'video')
		if (sender) await sender.replaceTrack(screenTrack)
		configureShareScreen()
		// Escuchar cuando el usuario presiona "Stop sharing" desde navegador
		screenTrack.onended = () => {
			configureShareScreen()
			stopScreenSharingOld()
		}
	}

	const stopScreenSharingOld = async () => {
		if (!screenTrackRef.current) return

		screenTrackRef.current.stop() // Detener el track
		//setIsScreenSharing(false);

		// Esperar a que track de pantalla finalice
		pluginHandleRef.current.send({ message: { request: 'unpublish' } })
		pluginHandleRef.current.hangup()
		pluginHandleRef.current.detach()
		pluginHandleRef.current = null

		// Esperar un momento y luego re-atachar el plugin y volver a publicar cámara
		setTimeout(() => {
			attachPlugin()
			configureShareScreen()
		}, 500)
	}

	const newRemoteFeed = (publisherId, display) => {
		if (remoteFeeds.find((f) => f.feedId === publisherId)) return

		const isOwnScreenShare =
			currentUserRef.current.id_janus_share_screen === publisherId &&
			display === 'screen-share'

		janusRef.current.attach({
			plugin: 'janus.plugin.videoroom',
			success: (pluginHandle) => {
				pluginHandle.send({
					message: {
						request: 'join',
						room: meetIdUser,
						ptype: 'subscriber',
						feed: publisherId,
					},
				})

				pluginHandle.onremotetrack = (track, mid, on) => {
					if (!on) return

					if (isOwnScreenShare && track.kind === 'audio') {
						console.log('xue ignore audio shared screen')
						return
					}

					if (!isOwnScreenShare) {
						setRemoteFeeds((prev) => {
							const exists = prev.find((f) => f.feedId === publisherId)
							if (exists) {
								exists.stream.addTrack(track)
								return [...prev]
							}
							const stream = new MediaStream([track])
							const ref = React.createRef()
							return [
								...prev,
								{ feedId: publisherId, stream, ref, pluginHandle, display },
							]
						})
					} else {
						const stream = new MediaStream([track])
						const ref = React.createRef()
						setOwnerShareScreen({
							feedId: publisherId,
							stream,
							ref,
							pluginHandle,
							display,
						})
					}
				}

				pluginHandle.onmessage = (msg, jsep) => {
					if (jsep) {
						pluginHandle.createAnswer({
							jsep,
							tracks: [
								{ type: 'audio', capture: true, recv: true },
								{ type: 'video', capture: true, recv: true },
							],
							success: (jsepAnswer) => {
								pluginHandle.send({
									message: { request: 'start' },
									jsep: jsepAnswer,
								})
								pluginHandle.send({
									message: {
										request: 'configure',
										substream: currentRemoteSubstreamRef.current,
									},
								})
							},
						})
					}
				}
			},
		})
	}

	const switchQuality = (substream) => {
		setCurrentSubstream(substream)
		remoteFeeds.forEach((f) => {
			f.pluginHandle.send({ message: { request: 'configure', substream } })
		})
	}

	const configureShareScreen = () => {
		const newStatus = !currentUserRef.current.status_screen
		sendMessage({
			type: 'change_status',
			action: 'status_screen',
			new_status: newStatus,
		})
	}

	const configurePublisherVideoDinamic = () => {
		const newStatus = !currentUserRef.current.status_video
		sendMessage({
			type: 'change_status',
			action: 'status_video',
			new_status: newStatus,
		})
	}

	const configurePublisherAudioDinamic = () => {
		const newStatus = !currentUserRef.current.status_microphone
		sendMessage({
			type: 'change_status',
			action: 'status_microphone',
			new_status: newStatus,
		})
	}

	const configurePublisherAudioRemote = (state) => {
		pluginHandleRef.current.send({
			message: { request: 'configure', audio: state },
		})
	}

	const configurePublisherVideoRemote = (state) => {
		pluginHandleRef.current.send({
			message: { request: 'configure', video: state },
		})
	}

	const configureRecordVideoRoom = () => {
		const newStatus =
			currentRecordRef.current?.recording === undefined
				? true
				: !currentRecordRef.current?.recording
		console.log('xue record obj: ' + JSON.stringify(currentRecordRef.current))
		console.log('xue record: ' + newStatus)
		//alert(newStatus)
		if (newStatus === true) {
			console.log('xue record: create: ' + newStatus)
			sendMessage({ type: 'create_record_meet' })
		} else {
			console.log('xue record: stop: ' + newStatus)
			sendMessage({ type: 'stop_record_meet' })
		}
	}

	const enrichedRemoteFeeds = useMemo(() => {
		return remoteFeeds.map((feed) => {
			const matchingUser =
				remoteUsers.find((user) => user.id_janus === feed.feedId) ||
				remoteUsers.find((user) => user.id_janus_share_screen === feed.feedId)

			return {
				...feed,
				data: matchingUser || null,
			}
		})
	}, [remoteFeeds, remoteUsers])

	useEffect(() => {
		enrichedRemoteFeeds.forEach((f) => {
			if (f.ref.current) f.ref.current.srcObject = f.stream
		})
	}, [enrichedRemoteFeeds])

	useEffect(() => {
		currentRemoteSubstreamRef.current = currentSubstream
	}, [currentSubstream])

	useEffect(() => {
		currentUserRef.current = currentUser
	}, [currentUser])

	useEffect(() => {
		if (currentUser) {
			if (currentUser.status_screen === false) {
				stopScreenSharing()
			}
		}
	}, [currentUser?.status_screen])

	useEffect(() => {
		if (!ownerShareScreen.stream) return

		// Asignar stream a video
		if (ownerShareScreenRef.current) {
			ownerShareScreenRef.current.srcObject = ownerShareScreen.stream
		}

		return () => {
			// Limpiar srcObject del video
			if (ownerShareScreenRef.current) {
				ownerShareScreenRef.current.srcObject = null
			}
		}
	}, [ownerShareScreen])

	useEffect(() => {
		currentRecordRef.current = currentRecord
	}, [currentRecord])

	const enterCredendials = () => {
		const meetVal = document.getElementById('meetIdUser').value
		const tokenVal = document.getElementById('tokenUser').value

		setMeetIdUser(meetVal)
		setTokenUser(tokenVal)

		// Muy importante: Conecta solo cuando tengas datos válidos
		if (meetVal && tokenVal) {
			connectSocket()
		} else {
			alert('Faltan datos para conectar.')
		}
	}

	const credentialsUser = (user) => {
		let meetVal = ''
		let tokenUseraux = ''
		setMeetIdUser(meetId.current)
		meetVal = meetId.current
		if (user === 'one') {
			console.log(user)
			tokenUseraux = tokenUserOne.current
			setTokenUser(tokenUserOne.current)
		}
		if (user === 'two') {
			console.log(user)
			tokenUseraux = tokenUserTwo.current
			setTokenUser(tokenUserTwo.current)
		}
		if (user === 'three') {
			console.log(user)
			tokenUseraux = tokenUserThree.current
			setTokenUser(tokenUserThree.current)
		}

		if (meetVal && tokenUseraux) {
			connectSocket()
		} else {
			alert('Faltan datos para conectar.')
		}
	}

	return (
		<div>
			<h1>Credential test</h1>
			<label htmlFor=''>meetIdUser</label>
			<input type='text' id='meetIdUser' />
			<br />
			<label htmlFor=''>tokenUser</label>
			<input type='text' id='tokenUser' />
			<br />
			<button onClick={enterCredendials}>Enter credentials</button>
			<button onClick={() => credentialsUser('one')}>Enter user 1</button>
			<button onClick={() => credentialsUser('two')}>Enter user 2</button>
			<button onClick={() => credentialsUser('three')}>Enter user 3</button>
			<br />
			<button onClick={disconnectAll}>❌ Desconectar</button>
			<h2>🎥 Janus VideoRoom React</h2>

			<div
				style={{
					position: 'relative',
					display: 'inline-block',
					margin: '5px',
				}}
			>
				<div
					style={{
						backgroundColor: 'rgba(0, 0, 255, 0.7)',
						color: 'white',
						padding: '2px 6px',
						fontSize: '12px',
						borderTopLeftRadius: '4px',
						borderTopRightRadius: '4px',
					}}
				>
					<div>
						<strong>Name: {currentUser.name} </strong>
					</div>
					<div>
						<strong>Device: {isMobile ? 'Mobile' : 'Desktop'} </strong>
					</div>
					<video
						ref={localVideoRef}
						autoPlay
						playsInline
						muted
						style={{ width: '480px', border: '2px solid blue' }}
					/>
				</div>
			</div>

			{ownerShareScreen?.stream && (
				<div
					style={{
						position: 'relative',
						display: 'inline-block',
						margin: '5px',
					}}
				>
					<div
						style={{
							backgroundColor: 'rgba(0, 0, 255, 0.7)',
							color: 'white',
							padding: '2px 6px',
							fontSize: '12px',
							borderTopLeftRadius: '4px',
							borderTopRightRadius: '4px',
						}}
					>
						<div>
							<strong>Name: {currentUser.name} </strong>
						</div>
						<div>
							<strong>Share Screen </strong>
						</div>
						<video
							ref={ownerShareScreenRef}
							autoPlay
							playsInline
							muted
							style={{ width: '480px', border: '2px solid blue' }}
						/>
					</div>
				</div>
			)}

			<div>
				<button
					onClick={() => configurePublisherAudioDinamic()}
					disabled={!currentUser.microphone}
				>
					{currentUser.status_microphone ? '🎤 ' : '🔇'}
				</button>
				<button
					onClick={() => configurePublisherVideoDinamic()}
					disabled={!currentUser.video}
				>
					{currentUser.status_video ? '📷' : '📷🚫'}
				</button>
				<button
					onClick={currentUser.status_screen ? stopScreenSharing : shareScreen}
					disabled={!currentUser.screen}
				>
					{currentUser.status_screen
						? '❌ Dejar de Compartir'
						: '📺 Compartir Pantalla'}
				</button>

				<br />

				<button onClick={configureRecordVideoRoom}>
					{currentRecord?.recording ? 'Stop Record' : 'Record'}
				</button>

				<br />
				<hr />
				<h3>all actions</h3>

				<br />
				<hr />
				<button
					onClick={() => {
						sendMessage({
							type: 'change_status_all_participants',
							action: 'status_microphone',
							new_status: false,
						})
					}}
				>
					🔇
				</button>
				<button
					onClick={() => {
						sendMessage({
							type: 'change_status_all_participants',
							action: 'microphone',
							new_status: false,
						})
					}}
				>
					🔇🔓🚫
				</button>
				<button
					onClick={() => {
						sendMessage({
							type: 'change_status_all_participants',
							action: 'microphone',
							new_status: true,
						})
					}}
				>
					🔇🔓🟢
				</button>

				<button
					onClick={() => {
						sendMessage({
							type: 'change_status_all_participants',
							action: 'status_video',
							new_status: false,
						})
					}}
				>
					📷🚫
				</button>

				<button
					onClick={() => {
						sendMessage({
							type: 'change_status_all_participants',
							action: 'video',
							new_status: false,
						})
					}}
				>
					📷🔓🚫
				</button>
				<button
					onClick={() => {
						sendMessage({
							type: 'change_status_all_participants',
							action: 'video',
							new_status: true,
						})
					}}
				>
					📷🔓🟢
				</button>
				<button
					onClick={() => {
						sendMessage({
							type: 'change_status_all_participants',
							action: 'status_screen',
							new_status: false,
						})
					}}
				>
					🖥️🚫
				</button>
				<button
					onClick={() => {
						sendMessage({
							type: 'change_status_all_participants',
							action: 'screen',
							new_status: false,
						})
					}}
				>
					🖥️🔓🚫
				</button>
				<button
					onClick={() => {
						sendMessage({
							type: 'change_status_all_participants',
							action: 'screen',
							new_status: true,
						})
					}}
				>
					🖥️🔓🟢
				</button>
			</div>
			<h3>👥 Participantes Remotos</h3>
			<div>
				<strong>📶 Calidad remota:</strong>
				<select
					value={currentSubstream}
					onChange={(e) => switchQuality(parseInt(e.target.value))}
				>
					<option value='0'>Media</option>
					<option value='1'>Baja</option>
					<option value='2'>Alta</option>
				</select>
			</div>

			<VideoRemote
				feeds={enrichedRemoteFeeds}
				currentusers={currentUser}
				onRemoteAction={({ type, action, new_status, channel_name }) => {
					sendMessage({
						type,
						action,
						new_status,
						channel_name,
					})
				}}
			></VideoRemote>
		</div>
	)
}

export default JanusTest
