using System;
using System.Collections.Generic;
using UnityEngine;

public class UnityMainThreadDispatcher : MonoBehaviour
{
    private static readonly Queue<Action> _executionQueue = new Queue<Action>();
    private static UnityMainThreadDispatcher _instance;

    public static UnityMainThreadDispatcher Instance() { return _instance; }

    void Awake()
    {
        if (_instance != null) { Destroy(gameObject); }
        else { _instance = this; DontDestroyOnLoad(gameObject); }
    }

    public void Enqueue(Action action)
    {
        lock (_executionQueue) { _executionQueue.Enqueue(action); }
    }

    void Update()
    {
        lock (_executionQueue)
        {
            while (_executionQueue.Count > 0) { _executionQueue.Dequeue().Invoke(); }
        }
    }
}