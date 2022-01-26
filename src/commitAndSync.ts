import { GitProcess } from 'dugite';
import { credentialOn, credentialOff } from './credential';
import { SyncParameterMissingError, GitPullPushError, CantSyncGitNotInitializedError } from './errors';
import { assumeSync, getDefaultBranchName, getGitRepositoryState, getSyncState, haveLocalChanges } from './inspect';
import { IGitUserInfos, ILogger, GitStep } from './interface';
import { defaultGitInfo as defaultDefaultGitInfo } from './defaultGitInfo';
import { commitFiles, continueRebase } from './sync';

/**
 * `git add .` + `git commit` + `git rebase` or something that can sync bi-directional
 */
export async function commitAndSync(options: {
  /** wiki folder path, can be relative */
  dir: string;
  /** the storage service url we are sync to, for example your github repo url */
  remoteUrl?: string;
  /** user info used in the commit message */
  userInfo?: IGitUserInfos;
  /** the commit message */
  commitMessage?: string;
  logger?: ILogger;
  defaultGitInfo: typeof defaultDefaultGitInfo;
  /** if you want to use a dynamic .gitignore, you can passing an array contains filepaths that want to ignore */
  filesToIgnore?: string[];
}): Promise<void> {
  const { dir, remoteUrl, commitMessage = 'Updated with Git-Sync', userInfo, logger, defaultGitInfo = defaultDefaultGitInfo, filesToIgnore } = options;
  const { gitUserName, email, branch } = userInfo ?? defaultGitInfo;
  const { accessToken } = userInfo ?? {};

  if (accessToken === '' || accessToken === undefined) {
    throw new SyncParameterMissingError('accessToken');
  }
  if (remoteUrl === '' || remoteUrl === undefined) {
    throw new SyncParameterMissingError('remoteUrl');
  }

  const logProgress = (step: GitStep): unknown =>
    logger?.info?.(step, {
      functionName: 'commitAndSync',
      step,
      dir,
      remoteUrl,
    });
  const logDebug = (message: string, step: GitStep): unknown =>
    logger?.debug?.(message, {
      functionName: 'commitAndSync',
      step,
      dir,
      remoteUrl,
    });
  const logWarn = (message: string, step: GitStep): unknown =>
    logger?.warn?.(message, {
      functionName: 'commitAndSync',
      step,
      dir,
      remoteUrl,
    });

  const defaultBranchName = (await getDefaultBranchName(dir)) ?? branch;
  /** when push to origin, we need to specify the local branch name and remote branch name */
  const branchMapping = `${defaultBranchName}:${defaultBranchName}`;

  // preflight check
  const repoStartingState = await getGitRepositoryState(dir, logger);
  if (repoStartingState.length === 0 || repoStartingState === '|DIRTY') {
    logProgress(GitStep.PrepareSync);
    logDebug(`${dir} , ${gitUserName} <${email ?? defaultGitInfo.email}>`, GitStep.PrepareSync);
  } else if (repoStartingState === 'NOGIT') {
    throw new CantSyncGitNotInitializedError(dir);
  } else {
    // we may be in middle of a rebase, try fix that
    await continueRebase(dir, gitUserName, email ?? defaultGitInfo.email, logger, repoStartingState);
  }
  if (await haveLocalChanges(dir)) {
    logProgress(GitStep.HaveThingsToCommit);
    logDebug(commitMessage, GitStep.HaveThingsToCommit);
    const { exitCode: commitExitCode, stderr: commitStdError } = await commitFiles(
      dir,
      gitUserName,
      email ?? defaultGitInfo.email,
      commitMessage,
      filesToIgnore,
    );
    if (commitExitCode !== 0) {
      logWarn(`commit failed ${commitStdError}`, GitStep.CommitComplete);
    }
    logProgress(GitStep.CommitComplete);
  }
  logProgress(GitStep.PreparingUserInfo);
  await credentialOn(dir, remoteUrl, gitUserName, accessToken);
  logProgress(GitStep.FetchingData);
  await GitProcess.exec(['fetch', 'origin', defaultBranchName], dir);
  let exitCode = 0;
  let stderr: string | undefined;
  switch (await getSyncState(dir, defaultBranchName, logger)) {
    case 'equal': {
      logProgress(GitStep.NoNeedToSync);
      await credentialOff(dir, remoteUrl);
      return;
    }
    case 'noUpstream': {
      logProgress(GitStep.NoUpstreamCantPush);
      ({ exitCode, stderr } = await GitProcess.exec(['push', 'origin', defaultBranchName], dir));
      if (exitCode === 0) {
        break;
      }
      logWarn(`exitCode: ${exitCode}, stderr of git push: ${stderr}`, GitStep.NoUpstreamCantPush);
      throw new CantSyncGitNotInitializedError(dir);
    }
    case 'ahead': {
      logProgress(GitStep.LocalAheadStartUpload);
      ({ exitCode, stderr } = await GitProcess.exec(['push', 'origin', branchMapping], dir));
      if (exitCode === 0) {
        break;
      }
      logWarn(`exitCode: ${exitCode}, stderr of git push: ${stderr}`, GitStep.LocalAheadStartUpload);
      break;
    }
    case 'behind': {
      logProgress(GitStep.LocalStateBehindSync);
      ({ exitCode, stderr } = await GitProcess.exec(['merge', '--ff', '--ff-only', `origin/${defaultBranchName}`], dir));
      if (exitCode === 0) {
        break;
      }
      logWarn(`exitCode: ${exitCode}, stderr of git merge: ${stderr}`, GitStep.LocalStateBehindSync);
      break;
    }
    case 'diverged': {
      logProgress(GitStep.LocalStateDivergeRebase);
      ({ exitCode, stderr } = await GitProcess.exec(['rebase', `origin/${defaultBranchName}`], dir));
      logProgress(GitStep.RebaseResultChecking);
      if (exitCode !== 0) {
        logWarn(`exitCode: ${exitCode}, stderr of git rebase: ${stderr}`, GitStep.RebaseResultChecking);
      }
      if (exitCode === 0 && (await getGitRepositoryState(dir, logger)).length === 0 && (await getSyncState(dir, defaultBranchName, logger)) === 'ahead') {
        logProgress(GitStep.RebaseSucceed);
      } else {
        await continueRebase(dir, gitUserName, email ?? defaultGitInfo.email, logger);
        logProgress(GitStep.RebaseConflictNeedsResolve);
      }
      await GitProcess.exec(['push', 'origin', branchMapping], dir);
      break;
    }
    default: {
      logProgress(GitStep.SyncFailedAlgorithmWrong);
    }
  }
  await credentialOff(dir, remoteUrl);
  if (exitCode === 0) {
    logProgress(GitStep.PerformLastCheckBeforeSynchronizationFinish);
    await assumeSync(dir, defaultBranchName, logger);
    logProgress(GitStep.SynchronizationFinish);
  } else {
    switch (exitCode) {
      // "message":"exitCode: 128, stderr of git push: fatal: unable to access 'https://github.com/tiddly-gittly/TiddlyWiki-Chinese-Tutorial.git/': LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to github.com:443 \n"
      case 128: {
        throw new GitPullPushError(options, stderr ?? '');
      }
      // TODO: handle auth expire and throw here
      default: {
        throw new GitPullPushError(options, stderr ?? '');
      }
    }
  }
}