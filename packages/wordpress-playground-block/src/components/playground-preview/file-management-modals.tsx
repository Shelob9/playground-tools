import { useState, forwardRef, useImperativeHandle } from '@wordpress/element';

import type { EditorFile } from '../../index';
import { FileNameModal } from '../file-name-modal';
import { isURL } from '../../util';

export interface FileManagerRef {
	setEditFileNameModalOpen: (open: boolean) => void;
	setNewFileModalOpen: (open: boolean) => void;
}

interface Props {
	files: EditorFile[];
	addFile: (file: EditorFile) => void;
	setActiveFileIndex: (index: number) => void;
	activeFileIndex: number;
	updateFile: (callback: (file: EditorFile) => EditorFile) => void;
}

export default forwardRef(function FileManagementModals(
	{ updateFile, addFile, setActiveFileIndex, files, activeFileIndex }: Props,
	ref: React.Ref<FileManagerRef>
) {
	const [isNewFileModalOpen, setNewFileModalOpen] = useState(false);
	const [isEditFileNameModalOpen, setEditFileNameModalOpen] = useState(false);
	const [downloadingFile, setDownloadingFile] = useState(false);
	const [downloadFileError, setDownloadFileError] = useState(false);
	async function updateActiveFile(newFileName: string) {
		setDownloadFileError(false);
		try {
			const updates = await constructFileObject(newFileName);
			updateFile((file) => ({
				...file,
				...updates,
			}));
			setEditFileNameModalOpen(false);
		} catch (e) {
			setDownloadFileError(true);
		}
	}
	async function createNewFile(newFileName: string) {
		setDownloadFileError(false);
		try {
			const newFile = (await constructFileObject(newFileName, {
				contents: '',
			})) as any;
			addFile(newFile);
			setActiveFileIndex(files.length);
			setNewFileModalOpen(false);
		} catch (e) {
			setDownloadFileError(true);
		}
	}
	async function constructFileObject(filename: string, defaults = {}) {
		const file: Partial<EditorFile> = {
			name: filename,
			...defaults,
		};
		if (isURL(filename)) {
			file.remoteUrl = filename;
			file.name =
				new URL(filename).pathname.split('/').pop() || 'remote-file';
			setDownloadingFile(true);
			try {
				const response = await fetch(file.remoteUrl, {
					credentials: 'omit',
				});
				file.contents = await response.text();
			} finally {
				setDownloadingFile(false);
			}
		}
		return file;
	}

	useImperativeHandle(ref, () => {
		return {
			setEditFileNameModalOpen: (open: boolean) => {
				setDownloadFileError(false);
				setEditFileNameModalOpen(open);
			},
			setNewFileModalOpen: (open: boolean) => {
				setDownloadFileError(false);
				setNewFileModalOpen(open);
			},
		};
	});

	return (
		<>
			{isEditFileNameModalOpen && (
				<FileNameModal
					title="Edit file name or URL"
					file={files[activeFileIndex]}
					onRequestClose={() => setEditFileNameModalOpen(false)}
					onSave={updateActiveFile}
					isLoading={downloadingFile}
					error={downloadFileError}
				/>
			)}

			{isNewFileModalOpen && (
				<FileNameModal
					title="Create new file"
					onRequestClose={() => setNewFileModalOpen(false)}
					onSave={createNewFile}
					isLoading={downloadingFile}
					error={downloadFileError}
				/>
			)}
		</>
	);
});
